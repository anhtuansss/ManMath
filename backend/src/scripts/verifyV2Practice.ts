import assert from 'assert';
import path from 'path';
import { prisma, disconnectPrisma } from '../lib/prisma';
import { importExamContentFile } from './importExamContentFromJson';
import {
  getPracticeByTopicSlugV2,
  gradePracticeV2,
} from '../services/examContentPracticeService';
import { ExamContentGradeRequestError } from '../services/examContentGradingService';

const forbiddenFields = new Set(['answerKey', 'correctAnswer', 'correctChoiceId', 'tolerance']);

function assertNoAnswerKeys(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(assertNoAnswerKeys); return; }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(forbiddenFields.has(key), false, `Unexpected answer-key field: ${key}`);
    assertNoAnswerKeys(nested);
  }
}

async function main(): Promise<void> {
  await importExamContentFile(path.resolve(process.cwd(), 'src/test-fixtures/v2-practice-draft-only.json'), { write: true });

  const practice = await getPracticeByTopicSlugV2('ham-so', 10);
  assert.ok(practice);
  assert.ok(practice.questions.length <= 10);
  assert.equal(practice.questions.some((question) => question.reference.questionId === 'draft-only'), false);
  assertNoAnswerKeys(JSON.parse(JSON.stringify(practice)) as unknown);
  assert.equal(await getPracticeByTopicSlugV2('khong-ton-tai', 10), null);

  const fixtureQuestionIds = ['sc-1', 'tf-1', 'sa-1'] as const;
  const fixtureQuestions = fixtureQuestionIds.map((questionId) => {
    const question = practice.questions.find(
      (candidate) => candidate.reference.questionId === questionId,
    );
    assert.ok(question, `Published V2 fixture question ${questionId} must be discoverable`);
    return question;
  });
  const refs = fixtureQuestions.map((question) => question.reference);
  const attemptsBefore = await prisma.attempt.count();
  const allCorrect = await gradePracticeV2({
    topicSlug: 'ham-so', questionRefs: refs,
    responses: [
      { questionId: fixtureQuestions[0].id, type: 'single_choice', choiceId: 'a' },
      { questionId: fixtureQuestions[1].id, type: 'true_false_group', values: { a: true, b: false, c: true, d: false } },
      { questionId: fixtureQuestions[2].id, type: 'short_answer', value: '1,5' },
    ],
  });
  assert.equal(allCorrect.scoreUnits, 175);
  assert.equal(allCorrect.maxScoreUnits, 175);
  assert.equal(allCorrect.correctCount, 3);
  assertNoAnswerKeys(JSON.parse(JSON.stringify(allCorrect)) as unknown);
  assert.equal(await prisma.attempt.count(), attemptsBefore, 'Practice grading must not create an Attempt');

  const partialTrueFalse = await gradePracticeV2({
    topicSlug: 'ham-so', questionRefs: refs,
    responses: [{ questionId: fixtureQuestions[1].id, type: 'true_false_group', values: { a: true, b: false, c: false, d: true } }],
  });
  assert.equal(partialTrueFalse.scoreUnits, 25);
  assert.equal(partialTrueFalse.unansweredCount, 2);

  const normalizedShortAnswer = await gradePracticeV2({
    topicSlug: 'ham-so', questionRefs: refs,
    responses: [{ questionId: fixtureQuestions[2].id, type: 'short_answer', value: '01,5' }],
  });
  assert.equal(normalizedShortAnswer.results[2]?.response?.type, 'short_answer');
  assert.equal(normalizedShortAnswer.results[2]?.response?.type === 'short_answer' && normalizedShortAnswer.results[2].response.response, '1,5');

  const missingResponses = await gradePracticeV2({ topicSlug: 'ham-so', questionRefs: refs, responses: [] });
  assert.equal(missingResponses.scoreUnits, 0);
  assert.equal(missingResponses.unansweredCount, 3);

  await assert.rejects(
    () => gradePracticeV2({ topicSlug: 'ham-so', questionRefs: refs, responses: [{ questionId: 'unknown', type: 'single_choice', choiceId: 'a' }] }),
    (error: unknown) => error instanceof ExamContentGradeRequestError,
  );
  await assert.rejects(
    () => gradePracticeV2({ topicSlug: 'ham-so', questionRefs: refs, responses: [
      { questionId: fixtureQuestions[0].id, type: 'single_choice', choiceId: 'a' },
      { questionId: fixtureQuestions[0].id, type: 'single_choice', choiceId: 'a' },
    ] }),
    (error: unknown) => error instanceof ExamContentGradeRequestError,
  );
  console.log('V2 practice verification passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(disconnectPrisma);
