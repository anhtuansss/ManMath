import assert from 'assert';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  ExamContentImportValidationError,
  validateExamContentImportPayload,
} from './importExamContentValidator';

const loadFixture = async (): Promise<unknown> => {
  const fixturePath = path.resolve(
    process.cwd(),
    'src/test-fixtures/v2-minimal-exam.json',
  );
  const rawContent = await readFile(fixturePath, 'utf8');

  return JSON.parse(rawContent) as unknown;
};

async function main(): Promise<void> {
  const rawFixture = await loadFixture();
  const envelope = validateExamContentImportPayload(rawFixture);

  assert.equal(envelope.questions.length, 3);
  assert.equal(envelope.questions[0]?.type, 'single_choice');
  assert.equal(envelope.questions[1]?.type, 'true_false_group');
  assert.equal(envelope.questions[2]?.type, 'short_answer');

  const invalidFixture = JSON.parse(JSON.stringify(rawFixture)) as {
    questions: Array<{ topicSlug: string }>;
  };
  invalidFixture.questions[0]!.topicSlug = 'unknown-topic';

  assert.throws(
    () => validateExamContentImportPayload(invalidFixture),
    (error: unknown) =>
      error instanceof ExamContentImportValidationError &&
      error.issues.some((issue) => issue.includes('unknown topic')),
  );

  console.log('Exam content import verification passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
