import assert from 'assert';
import { disconnectPrisma, prisma } from '../lib/prisma';
import {
  createExamContentAttempt,
  getExamContentAttemptReceiptById,
  getExamContentAttemptReviewById,
} from '../services/examContentAttemptService';

const examId = 'thpt-math-v2-sample';
const forbiddenAnswerKeyFields = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
  'answer',
  'tolerance',
  'explanation',
  'contentSnapshotVersion',
  'examContentSnapshot',
]);

function assertNoAnswerKeyFields(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoAnswerKeyFields(item);
    }
    return;
  }

  if (typeof value !== 'object' || value === null) {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(
      forbiddenAnswerKeyFields.has(key),
      false,
      `Attempt receipt must not contain ${key}`,
    );
    assertNoAnswerKeyFields(nestedValue);
  }
}

function assertReviewDoesNotExposeSnapshot(value: unknown): void {
  const forbiddenFields = new Set([
    'answerKey',
    'explanation',
    'examContentSnapshot',
    'contentSnapshotVersion',
  ]);

  if (Array.isArray(value)) {
    value.forEach(assertReviewDoesNotExposeSnapshot);
    return;
  }

  if (typeof value !== 'object' || value === null) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(forbiddenFields.has(key), false, `Review must not contain ${key}`);
    assertReviewDoesNotExposeSnapshot(nestedValue);
  }
}

async function main(): Promise<void> {
  const suffix = Date.now().toString();
  const owner = await prisma.user.create({
    data: {
      email: `verify-v2-owner-${suffix}@example.test`,
      fullName: 'V2 receipt owner',
      authProvider: 'password',
      passwordHash: 'not-used-by-verification',
    },
  });
  const otherUser = await prisma.user.create({
    data: {
      email: `verify-v2-other-${suffix}@example.test`,
      fullName: 'V2 receipt non-owner',
      authProvider: 'password',
      passwordHash: 'not-used-by-verification',
    },
  });

  const payload = {
    durationSeconds: 90,
    responses: [
      { questionId: 'sc-1', type: 'single_choice', choiceId: 'a' },
      {
        questionId: 'tf-1',
        type: 'true_false_group',
        values: { a: true, b: false, c: true, d: false },
      },
      { questionId: 'sa-1', type: 'short_answer', value: '1,5' },
    ],
  };

  const ownerAttempt = await createExamContentAttempt(examId, payload, owner.id);
  if (ownerAttempt === null) {
    throw new Error(`Exam ${examId} must exist`);
  }

  const ownerReceipt = await getExamContentAttemptReceiptById(
    ownerAttempt.attemptId,
    owner.id,
  );
  assert.notEqual(ownerReceipt, null);
  assert.equal(ownerReceipt?.attemptId, ownerAttempt.attemptId);
  assert.equal(ownerReceipt?.examId, examId);
  assert.equal(ownerReceipt?.answers.length, 3);
  assert.equal(ownerReceipt?.scoreUnits, 175);
  assert.equal(ownerReceipt?.maxScoreUnits, 175);
  assertNoAnswerKeyFields(JSON.parse(JSON.stringify(ownerReceipt)) as unknown);

  const ownerReview = await getExamContentAttemptReviewById(
    ownerAttempt.attemptId,
    owner.id,
  );
  assert.notEqual(ownerReview, null);
  assert.equal(ownerReview?.questions.length, 3);
  assert.equal(
    ownerReview?.questions.find((question) => question.type === 'single_choice')
      ?.correctAnswer.type,
    'single_choice',
  );
  assert.equal(
    ownerReview?.questions.find((question) => question.type === 'short_answer')
      ?.correctAnswer.type,
    'short_answer',
  );
  assertReviewDoesNotExposeSnapshot(JSON.parse(JSON.stringify(ownerReview)) as unknown);

  const otherUserReceipt = await getExamContentAttemptReceiptById(
    ownerAttempt.attemptId,
    otherUser.id,
  );
  assert.equal(otherUserReceipt, null);

  const otherUserReview = await getExamContentAttemptReviewById(
    ownerAttempt.attemptId,
    otherUser.id,
  );
  assert.equal(otherUserReview, null);

  const anonymousAttempt = await createExamContentAttempt(examId, payload);
  if (anonymousAttempt === null) {
    throw new Error(`Exam ${examId} must exist`);
  }

  const anonymousReceipt = await getExamContentAttemptReceiptById(
    anonymousAttempt.attemptId,
    owner.id,
  );
  assert.equal(anonymousReceipt, null);

  const anonymousReview = await getExamContentAttemptReviewById(
    anonymousAttempt.attemptId,
    owner.id,
  );
  assert.equal(anonymousReview, null);

  console.log('Exam content attempt read verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
