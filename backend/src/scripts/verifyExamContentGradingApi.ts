import assert from 'assert';
import { disconnectPrisma } from '../lib/prisma';
import {
  ExamContentGradeRequestError,
  gradeExamContent,
} from '../services/examContentGradingService';

const examId = 'thpt-math-v2-sample';
const forbiddenAnswerKeyFields = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
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
      `Grade response must not contain ${key}`,
    );
    assertNoAnswerKeyFields(nestedValue);
  }
}

async function main(): Promise<void> {
  const fullyCorrectResult = await gradeExamContent(examId, {
    responses: [
      {
        questionId: 'sc-1',
        type: 'single_choice',
        choiceId: 'a',
      },
      {
        questionId: 'tf-1',
        type: 'true_false_group',
        values: {
          a: true,
          b: false,
          c: true,
          d: false,
        },
      },
      {
        questionId: 'sa-1',
        type: 'short_answer',
        value: '1,5',
      },
    ],
  });

  if (fullyCorrectResult === null) {
    throw new Error(`Exam ${examId} must exist`);
  }

  assert.equal(
    fullyCorrectResult.scoringPolicyId,
    'vietnam_thpt_math_2025',
  );
  assert.equal(fullyCorrectResult.totalAwardedScore, 175);
  assert.equal(fullyCorrectResult.maxScore, 1000);
  assert.equal(fullyCorrectResult.results.length, 3);
  assert.equal(
    fullyCorrectResult.results.every((result) => result.isCorrect),
    true,
  );
  assertNoAnswerKeyFields(
    JSON.parse(JSON.stringify(fullyCorrectResult)) as unknown,
  );

  const unansweredResult = await gradeExamContent(examId, {
    responses: [
      {
        questionId: 'sc-1',
        type: 'single_choice',
        choiceId: 'a',
      },
    ],
  });

  if (unansweredResult === null) {
    throw new Error(`Exam ${examId} must exist`);
  }

  assert.equal(unansweredResult.totalAwardedScore, 25);
  assert.equal(
    unansweredResult.results.find(
      (result) => result.questionId === 'tf-1',
    )?.response,
    undefined,
  );

  await assert.rejects(
    () =>
      gradeExamContent(examId, {
        responses: [
          {
            questionId: 'sc-1',
            type: 'single_choice',
            choiceId: 'a',
          },
          {
            questionId: 'sc-1',
            type: 'single_choice',
            choiceId: 'a',
          },
        ],
      }),
    (error: unknown) => error instanceof ExamContentGradeRequestError,
  );

  await assert.rejects(
    () =>
      gradeExamContent(examId, {
        responses: [
          {
            questionId: 'not-in-this-exam',
            type: 'single_choice',
            choiceId: 'a',
          },
        ],
      }),
    (error: unknown) => error instanceof ExamContentGradeRequestError,
  );

  console.log('Exam content grading API verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
