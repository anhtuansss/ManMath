import assert from 'assert';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { randomUUID } from 'crypto';
import { createApp } from '../app';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { signAuthToken } from '../lib/jwt';
import { resetAttemptSubmissionRateLimitForVerification } from '../middleware/attemptSubmissionRateLimitMiddleware';

const forbiddenPublicFields = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
  'tolerance',
]);

function assertNoAnswerKey(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoAnswerKey);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(forbiddenPublicFields.has(key), false, `Public response exposed ${key}`);
    assertNoAnswerKey(nestedValue);
  }
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

async function main(): Promise<void> {
  const server = createApp().listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const listResponse = await fetch(`${baseUrl}/api/exams`);
    assert.equal(listResponse.status, 200);
    const list = await readJson(listResponse) as Array<{ id: string }>;
    assert.notEqual(list.find((exam) => exam.id === 'verify-v2-minimal-exam'), undefined);

    const examResponse = await fetch(`${baseUrl}/api/v2/exams/verify-v2-minimal-exam`);
    assert.equal(examResponse.status, 200);
    const publicExam = await readJson(examResponse) as { examVersionId: string };
    assert.equal(typeof publicExam.examVersionId, 'string');
    assertNoAnswerKey(publicExam);

    const gradeResponse = await fetch(`${baseUrl}/api/v2/exams/verify-v2-minimal-exam/grade`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ examVersionId: publicExam.examVersionId, responses: [] }),
    });
    assert.equal(gradeResponse.status, 200);
    assertNoAnswerKey(await readJson(gradeResponse));

    const suffix = Date.now().toString();
    const owner = await prisma.user.create({
      data: { email: `verify-http-owner-${suffix}@example.test`, authProvider: 'password', passwordHash: 'not-used' },
    });
    const other = await prisma.user.create({
      data: { email: `verify-http-other-${suffix}@example.test`, authProvider: 'password', passwordHash: 'not-used' },
    });
    const ownerToken = signAuthToken({ userId: owner.id, email: owner.email });
    const otherToken = signAuthToken({ userId: other.id, email: other.email });

    const submit = async (
      idempotencyKey: string | undefined,
      authorization?: string,
      payload: Record<string, unknown> = { examVersionId: publicExam.examVersionId, responses: [], durationSeconds: 0 },
    ): Promise<Response> => fetch(`${baseUrl}/api/v2/exams/verify-v2-minimal-exam/attempts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authorization === undefined ? {} : { authorization: `Bearer ${authorization}` }),
        ...(idempotencyKey === undefined ? {} : { 'Idempotency-Key': idempotencyKey }),
      },
      body: JSON.stringify(payload),
    });

    resetAttemptSubmissionRateLimitForVerification();
    const ownerKey = randomUUID();
    const createResponse = await submit(ownerKey, ownerToken);
    assert.equal(createResponse.status, 201);
    const created = await readJson(createResponse) as { attemptId: string };

    const replayResponse = await submit(ownerKey, ownerToken);
    assert.equal(replayResponse.status, 200);
    assert.equal(replayResponse.headers.get('Idempotency-Replayed'), 'true');
    assert.equal((await readJson(replayResponse) as { attemptId: string }).attemptId, created.attemptId);
    const reorderedReplay = await submit(ownerKey, ownerToken, {
      durationSeconds: 0,
      responses: [],
      examVersionId: publicExam.examVersionId,
    });
    assert.equal(reorderedReplay.status, 200);
    assert.equal(await prisma.attempt.count({ where: { idempotencyKey: ownerKey } }), 1);

    assert.equal((await submit(ownerKey, ownerToken, { examVersionId: publicExam.examVersionId, responses: [], durationSeconds: 1 })).status, 409);
    assert.equal((await submit(ownerKey, otherToken)).status, 409);
    assert.equal((await submit(undefined, ownerToken)).status, 400);
    assert.equal((await submit('not-a-uuid', ownerToken)).status, 400);
    assert.equal((await submit(randomUUID(), ownerToken, { examVersionId: publicExam.examVersionId, responses: [], durationSeconds: -1 })).status, 400);
    assert.equal((await submit(randomUUID(), ownerToken, { examVersionId: publicExam.examVersionId, responses: [], durationSeconds: 5401 })).status, 400);

    const concurrentKey = randomUUID();
    const concurrentResponses = await Promise.all(Array.from({ length: 4 }, () => submit(concurrentKey, ownerToken)));
    assert.equal(concurrentResponses.filter((response) => response.status === 201).length, 1);
    assert.equal(concurrentResponses.filter((response) => response.status === 200).length, 3);
    assert.equal(await prisma.attempt.count({ where: { idempotencyKey: concurrentKey } }), 1);

    const anonymousKey = randomUUID();
    const anonymousCreated = await submit(anonymousKey);
    assert.equal(anonymousCreated.status, 201);
    const anonymousCreatedBody = await readJson(anonymousCreated) as { attemptId: string; anonymousReceiptToken: string };
    const anonymousReplay = await submit(anonymousKey);
    assert.equal(anonymousReplay.status, 200);
    const anonymousReplayBody = await readJson(anonymousReplay) as { anonymousReceiptToken: string };
    assert.equal(anonymousReplayBody.anonymousReceiptToken, anonymousCreatedBody.anonymousReceiptToken);
    const anonymousReceipt = await fetch(`${baseUrl}/api/v2/attempts/${anonymousCreatedBody.attemptId}/anonymous-receipt`, {
      headers: { 'X-Attempt-Receipt-Token': anonymousReplayBody.anonymousReceiptToken },
    });
    assert.equal(anonymousReceipt.status, 200);

    const rateUser = await prisma.user.create({
      data: { email: `verify-http-rate-${suffix}@example.test`, authProvider: 'password', passwordHash: 'not-used' },
    });
    const rateToken = signAuthToken({ userId: rateUser.id, email: rateUser.email });
    for (let index = 0; index < 12; index += 1) {
      assert.equal((await submit(randomUUID(), rateToken)).status, 201);
    }
    assert.equal((await submit(randomUUID(), rateToken)).status, 429);

    const ownerReceipt = await fetch(`${baseUrl}/api/v2/attempts/${created.attemptId}`, {
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(ownerReceipt.status, 200);
    assertNoAnswerKey(await readJson(ownerReceipt));

    const otherReceipt = await fetch(`${baseUrl}/api/v2/attempts/${created.attemptId}`, {
      headers: { authorization: `Bearer ${otherToken}` },
    });
    assert.equal(otherReceipt.status, 404);

    console.log('V2 HTTP integration verification passed');
  } finally {
    await new Promise<void>((resolve, reject) => {
      (server as Server).close((error) => error ? reject(error) : resolve());
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
