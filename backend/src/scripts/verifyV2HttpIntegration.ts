import assert from 'assert';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createApp } from '../app';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { signAuthToken } from '../lib/jwt';

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
    const list = await readJson(listResponse) as Array<{ id: string; contentEngine: string }>;
    assert.equal(list.find((exam) => exam.id === 'thpt-math-v2-sample')?.contentEngine, 'v2');

    const examResponse = await fetch(`${baseUrl}/api/v2/exams/thpt-math-v2-sample`);
    assert.equal(examResponse.status, 200);
    const publicExam = await readJson(examResponse) as { examVersionId: string };
    assert.equal(typeof publicExam.examVersionId, 'string');
    assertNoAnswerKey(publicExam);

    const gradeResponse = await fetch(`${baseUrl}/api/v2/exams/thpt-math-v2-sample/grade`, {
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

    const createResponse = await fetch(`${baseUrl}/api/v2/exams/thpt-math-v2-sample/attempts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ examVersionId: publicExam.examVersionId, responses: [] }),
    });
    assert.equal(createResponse.status, 201);
    const created = await readJson(createResponse) as { attemptId: string };

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
