import assert from 'assert';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createApp } from '../app';
import { disconnectPrisma, prisma } from '../lib/prisma';
import {
  createExamContentAttempt,
  getAnonymousExamContentAttemptReceiptById,
  getExamContentAttemptReceiptById,
  getExamContentAttemptReviewById,
} from '../services/examContentAttemptService';

const examId = 'thpt-math-v2-sample';

const forbiddenReceiptFields = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
  'answer',
  'tolerance',
  'solution',
  'explanation',
  'anonymousReceiptToken',
  'anonymousReceiptTokenHash',
]);

function assertSafeReceipt(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertSafeReceipt);
    return;
  }
  if (typeof value !== 'object' || value === null) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(forbiddenReceiptFields.has(key), false, `Receipt leaked ${key}`);
    assertSafeReceipt(nestedValue);
  }
}

async function main(): Promise<void> {
  const publishedVersion = await prisma.examVersion.findFirst({
    where: { examId, status: 'published' },
    orderBy: { versionNumber: 'desc' },
    select: { id: true },
  });
  assert.notEqual(publishedVersion, null, 'Fixture needs a published V2 version');

  const created = await createExamContentAttempt(examId, {
    examVersionId: publishedVersion?.id,
    responses: [],
  });
  assert.notEqual(created, null);
  assert.equal(typeof created?.anonymousReceiptToken, 'string');
  const rawToken = created?.anonymousReceiptToken;
  assert.ok(rawToken && rawToken.length >= 32);

  const persisted = await prisma.attempt.findUnique({
    where: { id: created?.attemptId },
    select: {
      anonymousReceiptTokenHash: true,
      anonymousReceiptExpiresAt: true,
    },
  });
  assert.notEqual(persisted, null);
  assert.notEqual(persisted?.anonymousReceiptTokenHash, rawToken);
  assert.equal(typeof persisted?.anonymousReceiptTokenHash, 'string');
  assert.ok(
    (persisted?.anonymousReceiptExpiresAt?.getTime() ?? 0) > Date.now() + (6 * 24 * 60 * 60 * 1000),
    'Anonymous token must expire around seven days after creation',
  );

  const receipt = await getAnonymousExamContentAttemptReceiptById(
    created!.attemptId,
    rawToken!,
  );
  assert.notEqual(receipt, null);
  assertSafeReceipt(JSON.parse(JSON.stringify(receipt)) as unknown);

  assert.equal(
    await getAnonymousExamContentAttemptReceiptById(created!.attemptId, 'wrong-token'),
    null,
  );
  assert.equal(
    await getExamContentAttemptReceiptById(created!.attemptId),
    null,
    'Attempt id alone is not a credential',
  );
  assert.equal(
    await getExamContentAttemptReviewById(created!.attemptId, 'not-the-owner'),
    null,
    'Anonymous receipt credential must never unlock review',
  );

  const server = createApp().listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const rejected = await fetch(
      `${baseUrl}/api/v2/attempts/${created!.attemptId}/anonymous-receipt`,
    );
    assert.equal(rejected.status, 404);

    const recovered = await fetch(
      `${baseUrl}/api/v2/attempts/${created!.attemptId}/anonymous-receipt`,
      { headers: { 'X-Attempt-Receipt-Token': rawToken! } },
    );
    assert.equal(recovered.status, 200);
    assertSafeReceipt(await recovered.json() as unknown);

    const review = await fetch(`${baseUrl}/api/v2/attempts/${created!.attemptId}/review`);
    assert.equal(review.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => {
      (server as Server).close((error) => error ? reject(error) : resolve());
    });
  }

  console.log('Anonymous attempt receipt verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
