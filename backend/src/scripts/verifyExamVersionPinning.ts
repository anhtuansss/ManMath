import assert from 'assert';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { validateExamContentImportPayload } from './importExamContentValidator';
import { importExamContent } from '../services/examContentImportService';
import { publishDraftExamVersion } from '../services/examVersionPublishService';
import {
  createExamContentAttempt,
  getExamContentAttemptReceiptById,
  getExamContentAttemptReviewById,
} from '../services/examContentAttemptService';
import { getPublicExamContentById } from '../services/examContentReadService';
import { assertVerificationDatabase } from '../config/verificationDatabase';

const fixture = require('../test-fixtures/v2-minimal-exam.json') as Record<string, unknown>;

function makeFixture(examId: string, description: string): unknown {
  const copy = JSON.parse(JSON.stringify(fixture)) as Record<string, unknown>;
  copy.exam = { ...(copy.exam as Record<string, unknown>), id: examId, description };
  return copy;
}

async function submit(examId: string, examVersionId: string) {
  return createExamContentAttempt(examId, { examVersionId, responses: [] });
}

async function assertPinnedAttempt(
  attemptId: string,
  expectedExamVersionId: string,
  ownerId: string,
): Promise<void> {
  const persistedAttempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      examVersionId: true,
      answers: {
        select: {
          questionExternalId: true,
          examVersionQuestionId: true,
          examVersionQuestion: {
            select: {
              examVersionId: true,
              externalId: true,
            },
          },
        },
      },
    },
  });

  assert.notEqual(persistedAttempt, null);
  assert.equal(persistedAttempt?.examVersionId, expectedExamVersionId);
  assert.equal(persistedAttempt?.answers.length, 3);

  for (const answer of persistedAttempt?.answers ?? []) {
    assert.notEqual(answer.questionExternalId, null);
    assert.notEqual(answer.examVersionQuestionId, null);
    assert.notEqual(answer.examVersionQuestion, null);
    assert.equal(answer.examVersionQuestion?.examVersionId, expectedExamVersionId);
    assert.equal(answer.examVersionQuestion?.externalId, answer.questionExternalId);
  }

  const receipt = await getExamContentAttemptReceiptById(attemptId, ownerId);
  assert.equal(receipt?.examVersionId, expectedExamVersionId);
  assert.equal(receipt?.answers.length, 3);

  const review = await getExamContentAttemptReviewById(attemptId, ownerId);
  assert.equal(review?.questions.length, 3);
}

async function main(): Promise<void> {
  assertVerificationDatabase();
  const examId = `verify-version-pinning-${Date.now()}`;
  const owner = await prisma.user.create({
    data: {
      email: `verify-version-pinning-${Date.now()}@example.test`,
      authProvider: 'password',
      passwordHash: 'not-used-by-verification',
    },
  });

  await importExamContent(validateExamContentImportPayload(makeFixture(examId, 'draft v1')));
  assert.equal(await getPublicExamContentById(examId), null);

  const v1 = await publishDraftExamVersion(examId);
  const publicV1 = await getPublicExamContentById(examId);
  assert.equal(publicV1?.examVersionId, v1.versionId);
  const v1Attempt = await createExamContentAttempt(
    examId,
    { examVersionId: v1.versionId, responses: [] },
    owner.id,
  );
  assert.notEqual(v1Attempt, null);
  if (v1Attempt === null) throw new Error('V1 attempt must be created');
  await assertPinnedAttempt(v1Attempt.attemptId, v1.versionId, owner.id);

  await importExamContent(validateExamContentImportPayload(makeFixture(examId, 'draft v2')));
  const stillPublicV1 = await getPublicExamContentById(examId);
  assert.equal(stillPublicV1?.examVersionId, v1.versionId);
  assert.notEqual(await submit(examId, v1.versionId), null);

  const v2 = await publishDraftExamVersion(examId);
  const publicV2 = await getPublicExamContentById(examId);
  assert.equal(publicV2?.examVersionId, v2.versionId);
  assert.notEqual(v2.versionId, v1.versionId);
  assert.equal(await submit(examId, v1.versionId), null);
  await assertPinnedAttempt(v1Attempt.attemptId, v1.versionId, owner.id);
  assert.notEqual(await submit(examId, v2.versionId), null);

  console.log('Exam version pinning verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
