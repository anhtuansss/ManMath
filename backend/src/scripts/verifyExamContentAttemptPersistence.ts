import assert from 'assert';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { createExamContentAttempt } from '../services/examContentAttemptService';

const examId = 'thpt-math-v2-sample';
const forbiddenAnswerKeyFields = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
  'answer',
  'tolerance',
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
      `Persisted response must not contain ${key}`,
    );
    assertNoAnswerKeyFields(nestedValue);
  }
}

async function getAttemptOrThrow(attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      score: true,
      scoringPolicy: true,
      scoreUnits: true,
      maxScoreUnits: true,
      answers: {
        select: {
          questionExternalId: true,
          questionType: true,
          response: true,
          awardedScoreUnits: true,
          maxScoreUnits: true,
          isCorrect: true,
          isFullyCorrect: true,
          correctOptionIndex: true,
        },
      },
    },
  });

  if (attempt === null) {
    throw new Error(`Attempt ${attemptId} must exist`);
  }

  return attempt;
}

async function main(): Promise<void> {
  const completeAttempt = await createExamContentAttempt(examId, {
    durationSeconds: 90,
    responses: [
      {
        questionId: 'sc-1',
        type: 'single_choice',
        choiceId: 'a',
      },
      {
        questionId: 'tf-1',
        type: 'true_false_group',
        values: { a: true, b: false, c: true, d: false },
      },
      {
        questionId: 'sa-1',
        type: 'short_answer',
        value: '1,5',
      },
    ],
  });

  if (completeAttempt === null) {
    throw new Error(`Exam ${examId} must exist`);
  }

  assert.equal(completeAttempt.scoreUnits, 175);
  assert.equal(completeAttempt.maxScoreUnits, 175);
  assert.equal(completeAttempt.correctCount, 3);
  assert.equal(completeAttempt.totalQuestions, 3);
  assert.equal(completeAttempt.unansweredCount, 0);

  const persistedCompleteAttempt = await getAttemptOrThrow(
    completeAttempt.attemptId,
  );
  assert.equal(persistedCompleteAttempt.score, 1.75);
  assert.equal(
    persistedCompleteAttempt.scoringPolicy,
    'vietnam_thpt_math_2025',
  );
  assert.equal(persistedCompleteAttempt.answers.length, 3);
  assert.equal(
    new Set(
      persistedCompleteAttempt.answers.map((answer) => answer.questionExternalId),
    ).size,
    3,
  );

  for (const answer of persistedCompleteAttempt.answers) {
    assert.notEqual(answer.questionExternalId, null);
    assert.notEqual(answer.questionType, null);
    assert.notEqual(answer.awardedScoreUnits, null);
    assert.notEqual(answer.maxScoreUnits, null);
    assert.equal(answer.isFullyCorrect, true);
    assert.equal(answer.isCorrect, answer.isFullyCorrect);
    assert.equal(answer.correctOptionIndex, null);
    assertNoAnswerKeyFields(answer.response);
  }

  const partialAttempt = await createExamContentAttempt(examId, {
    responses: [
      {
        questionId: 'sc-1',
        type: 'single_choice',
        choiceId: 'a',
      },
    ],
  });

  if (partialAttempt === null) {
    throw new Error(`Exam ${examId} must exist`);
  }

  assert.equal(partialAttempt.scoreUnits, 25);
  assert.equal(partialAttempt.unansweredCount, 2);

  const persistedPartialAttempt = await getAttemptOrThrow(
    partialAttempt.attemptId,
  );
  assert.equal(persistedPartialAttempt.answers.length, 3);
  assert.equal(
    persistedPartialAttempt.answers.filter((answer) => answer.response === null)
      .length,
    2,
  );

  console.log('Exam content attempt persistence verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
