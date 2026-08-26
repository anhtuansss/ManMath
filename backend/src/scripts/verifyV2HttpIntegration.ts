import assert from 'assert';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { randomUUID } from 'crypto';
import path from 'path';
import { createApp } from '../app';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { signAuthToken } from '../lib/jwt';
import { resetAttemptSubmissionRateLimitForVerification } from '../middleware/attemptSubmissionRateLimitMiddleware';
import {
  authorizeTimingSessionForSubmission,
  ExamTimingSessionError,
} from '../services/examTimingSessionService';
import { importExamContentFile } from './importExamContentFromJson';

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
    assert.equal(gradeResponse.status, 404);

    await importExamContentFile(
      path.resolve(process.cwd(), 'src/test-fixtures/v2-practice-draft-only.json'),
      { write: true },
    );
    const draft = await prisma.examVersion.findFirst({
      where: { examId: 'verify-v2-practice-draft-only', status: 'draft' },
      select: { id: true },
    });
    assert.notEqual(draft, null);
    assert.equal(
      (await fetch(`${baseUrl}/api/v2/exams/verify-v2-practice-draft-only`)).status,
      404,
    );

    const suffix = Date.now().toString();
    const owner = await prisma.user.create({
      data: { email: `verify-http-owner-${suffix}@example.test`, authProvider: 'password', passwordHash: 'not-used' },
    });
    const other = await prisma.user.create({
      data: { email: `verify-http-other-${suffix}@example.test`, authProvider: 'password', passwordHash: 'not-used' },
    });
    const ownerToken = signAuthToken({ userId: owner.id, email: owner.email });
    const otherToken = signAuthToken({ userId: other.id, email: other.email });

    const startTiming = async (authorization?: string): Promise<{ id: string; anonymousTimingSessionToken?: string }> => {
      const response = await fetch(`${baseUrl}/api/v2/exams/verify-v2-minimal-exam/timing-sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(authorization === undefined ? {} : { authorization: `Bearer ${authorization}` }) },
        body: JSON.stringify({ examVersionId: publicExam.examVersionId }),
      });
      assert.equal(response.status, 201);
      return readJson(response) as Promise<{ id: string; anonymousTimingSessionToken?: string }>;
    };
    const ownerTiming = await startTiming(ownerToken);

    await assert.rejects(
      prisma.$transaction((tx) => authorizeTimingSessionForSubmission(tx, {
        sessionId: ownerTiming.id,
        examId: 'another-exam',
        examVersionId: publicExam.examVersionId,
        access: { userId: owner.id },
        now: new Date(),
      })),
      (error: unknown) => error instanceof ExamTimingSessionError && error.code === 'mismatch',
    );

    const correctAttemptPayload = {
      examVersionId: publicExam.examVersionId,
      timingSessionId: ownerTiming.id,
      durationSeconds: 0,
      responses: [
        { questionId: 'sc-1', type: 'single_choice', choiceId: 'a' },
        { questionId: 'tf-1', type: 'true_false_group', values: { a: true, b: false, c: true, d: false } },
        { questionId: 'sa-1', type: 'short_answer', value: '1,5' },
      ],
    };

    const submit = async (
      idempotencyKey: string | undefined,
      authorization?: string,
      payload: Record<string, unknown> = correctAttemptPayload,
      anonymousTimingSessionToken?: string,
    ): Promise<Response> => fetch(`${baseUrl}/api/v2/exams/verify-v2-minimal-exam/attempts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authorization === undefined ? {} : { authorization: `Bearer ${authorization}` }),
        ...(anonymousTimingSessionToken === undefined ? {} : { 'X-Exam-Timing-Session-Token': anonymousTimingSessionToken }),
        ...(idempotencyKey === undefined ? {} : { 'Idempotency-Key': idempotencyKey }),
      },
      body: JSON.stringify(payload),
    });

    resetAttemptSubmissionRateLimitForVerification();
    const forcedServerStart = new Date(Date.now() - 60_000);
    await prisma.examTimingSession.update({
      where: { id: ownerTiming.id },
      data: { startedAt: forcedServerStart, expiresAt: new Date(Date.now() + 60_000) },
    });
    const resumedTiming = await fetch(`${baseUrl}/api/v2/exam-timing-sessions/${ownerTiming.id}`, {
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(resumedTiming.status, 200);
    assert.equal(
      (await readJson(resumedTiming) as { startedAt: string }).startedAt,
      forcedServerStart.toISOString(),
    );
    const ownerKey = randomUUID();
    const createResponse = await submit(ownerKey, ownerToken);
    assert.equal(createResponse.status, 201);
    const created = await readJson(createResponse) as {
      attemptId: string;
      scoreUnits: number;
      durationSeconds: number;
      results: Array<{ isCorrect: boolean }>;
    };
    assert.equal(created.scoreUnits, 175);
    assert.equal(created.results.every((result) => result.isCorrect), true);
    assert.equal(created.durationSeconds >= 60, true);

    const replayResponse = await submit(ownerKey, ownerToken);
    assert.equal(replayResponse.status, 200);
    assert.equal(replayResponse.headers.get('Idempotency-Replayed'), 'true');
    const replayed = await readJson(replayResponse) as { attemptId: string; durationSeconds: number };
    assert.equal(replayed.attemptId, created.attemptId);
    assert.equal(replayed.durationSeconds, created.durationSeconds);
    const reorderedReplay = await submit(ownerKey, ownerToken, {
      examVersionId: publicExam.examVersionId,
      timingSessionId: ownerTiming.id,
      responses: [
        { questionId: 'sc-1', type: 'single_choice', choiceId: 'a' },
        { questionId: 'tf-1', type: 'true_false_group', values: { a: true, b: false, c: true, d: false } },
        { questionId: 'sa-1', type: 'short_answer', value: '1,5' },
      ],
    });
    assert.equal(reorderedReplay.status, 200);
    assert.equal(await prisma.attempt.count({ where: { idempotencyKey: ownerKey } }), 1);

    assert.equal((await submit(ownerKey, ownerToken, { examVersionId: publicExam.examVersionId, timingSessionId: ownerTiming.id, responses: [] })).status, 409);
    assert.equal((await submit(ownerKey, otherToken)).status, 409);
    assert.equal((await submit(undefined, ownerToken)).status, 400);
    assert.equal((await submit('not-a-uuid', ownerToken)).status, 400);
    assert.equal((await submit(randomUUID(), ownerToken, {
      examVersionId: draft!.id,
      timingSessionId: ownerTiming.id,
      responses: [],
    })).status, 404);

    const concurrentKey = randomUUID();
    const concurrentTiming = await startTiming(ownerToken);
    const concurrentPayload = { ...correctAttemptPayload, timingSessionId: concurrentTiming.id };
    const concurrentResponses = await Promise.all(Array.from({ length: 4 }, () => submit(concurrentKey, ownerToken, concurrentPayload)));
    assert.equal(concurrentResponses.filter((response) => response.status === 201).length, 1);
    assert.equal(concurrentResponses.filter((response) => response.status === 200).length, 3);
    assert.equal(await prisma.attempt.count({ where: { idempotencyKey: concurrentKey } }), 1);

    const anonymousKey = randomUUID();
    const anonymousTiming = await startTiming();
    const anonymousPayload = { ...correctAttemptPayload, timingSessionId: anonymousTiming.id };
    const anonymousCreated = await submit(anonymousKey, undefined, anonymousPayload, anonymousTiming.anonymousTimingSessionToken);
    assert.equal(anonymousCreated.status, 201);
    const anonymousCreatedBody = await readJson(anonymousCreated) as { attemptId: string; anonymousReceiptToken: string };
    const anonymousReplay = await submit(anonymousKey, undefined, anonymousPayload, anonymousTiming.anonymousTimingSessionToken);
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
      const timing = await startTiming(rateToken);
      assert.equal((await submit(randomUUID(), rateToken, { ...correctAttemptPayload, timingSessionId: timing.id })).status, 201);
    }
    const limitedTiming = await startTiming(rateToken);
    assert.equal((await submit(randomUUID(), rateToken, { ...correctAttemptPayload, timingSessionId: limitedTiming.id })).status, 429);

    const ownerReceipt = await fetch(`${baseUrl}/api/v2/attempts/${created.attemptId}`, {
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(ownerReceipt.status, 200);
    assertNoAnswerKey(await readJson(ownerReceipt));

    const ownerReview = await fetch(`${baseUrl}/api/v2/attempts/${created.attemptId}/review`, {
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(ownerReview.status, 200);
    assert.equal((await readJson(ownerReview) as { questions: unknown[] }).questions.length, 3);

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
