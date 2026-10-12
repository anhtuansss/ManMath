import assert from 'assert';
import { disconnectPrisma } from '../lib/prisma';
import { getPublicExamContentById } from '../services/examContentReadService';

const examId = 'verify-v2-minimal-exam';
const forbiddenAnswerKeyFields = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
]);

function assertNoRecursiveAnswerKeyFields(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoRecursiveAnswerKeyFields(item);
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
      `Public response must not contain ${key}`,
    );
    assertNoRecursiveAnswerKeyFields(nestedValue);
  }
}

async function main(): Promise<void> {
  const response = await getPublicExamContentById(examId);

  if (response === null) {
    throw new Error(`Imported exam ${examId} must exist`);
  }

  assert.equal(response.questions.length, 3);
  assert.deepEqual(
    response.questions.map((question) => question.id),
    ['sc-1', 'tf-1', 'sa-1'],
  );
  assert.deepEqual(
    response.questions.map((question) => question.type),
    ['single_choice', 'true_false_group', 'short_answer'],
  );

  const serializedResponse = JSON.parse(JSON.stringify(response)) as unknown;
  assertNoRecursiveAnswerKeyFields(serializedResponse);

  for (const question of response.questions) {
    assert.equal('answerKey' in question, false);

    if (question.type === 'true_false_group') {
      assert.equal(
        'values' in question,
        false,
        'Public true/false question must not contain answer values',
      );
    }

    if (question.type === 'short_answer') {
      assert.equal('answer' in question, false);
      assert.equal('tolerance' in question, false);
      assert.equal('mode' in question, false);
    }
  }

  console.log('Exam content read verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
