import assert from 'assert';
import { randomUUID } from 'crypto';
import { assertVerificationDatabase } from '../config/verificationDatabase';
import type { QuestionInput } from '../types/examContent';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { importQuestionBank, publishQuestionBankBatch } from '../services/questionBankService';
import { cancelPracticeSession, getPracticeSession, openPracticeSession, submitPracticeSession } from '../services/practiceSessionService';

const topicSlug = 'ham-so-va-do-thi-nen-tang';
const subtopicSlug = 'ham-so-va-tap-xac-dinh';
const source = { name: 'Verification source', type: 'curated' as const, year: 2026, documentRef: 'verify-question-bank' };
const base = { schemaVersion: 1 as const, title: 'Verification question bank', source, taxonomy: { topicSlug, subtopicSlug } };

const question = (id: string, content: string): QuestionInput => ({
  id, type: 'single_choice', section: 1, order: 1, content, topicSlug, subtopicSlug,
  choices: [{ id: 'a', content: '0' }, { id: 'b', content: '1' }, { id: 'c', content: '2' }, { id: 'd', content: '3' }],
  answerKey: { correctChoiceId: 'a' },
} as unknown as QuestionInput);

async function user(): Promise<string> {
  return (await prisma.user.create({ data: { email: `qb-${Date.now()}-${Math.random()}@example.test`, authProvider: 'password', passwordHash: 'verify' } })).id;
}

function assertNoAnswerKey(value: unknown): void {
  const forbidden = new Set(['answerKey', 'correctAnswer', 'correctChoiceId', 'tolerance']);
  if (Array.isArray(value)) return value.forEach(assertNoAnswerKey);
  if (value === null || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(forbidden.has(key), false, `answer key leaked via ${key}`);
    assertNoAnswerKey(nested);
  }
}

async function main(): Promise<void> {
  assertVerificationDatabase();

  await importQuestionBank({ ...base, id: 'verify-qb-duplicate', source: { ...source, documentRef: 'manmath-exam:verify-v2-minimal-exam' }, questions: [{ question: question('qb-duplicate-sc-1', 'Giá trị của f(0) là bao nhiêu?'), sourceQuestionRef: 'sc-1', assetSource: null }] });
  await publishQuestionBankBatch('verify-qb-duplicate');

  const owner = await user();
  const first = await openPracticeSession({ topicSlug, subtopicSlug, questionCount: 5, questionTypes: ['single_choice'] }, owner);
  assert.ok(first.session.questions.length > 0, 'published full-exam pool remains selectable');
  const firstMembers = await prisma.practiceSessionQuestion.findMany({ where: { practiceSessionId: first.session.id } });
  assert.equal(firstMembers.some((item) => item.questionBankItemId !== null), false, 'full exam wins provenance duplicate');
  assert.ok(firstMembers[0]!.examVersionQuestionId);
  await cancelPracticeSession(first.session.id, owner);

  await importQuestionBank({ ...base, id: 'verify-qb-draft', questions: [{ question: question('qb-draft-sc-1', 'Draft only question'), sourceQuestionRef: 'draft', assetSource: null }] });
  await importQuestionBank({ ...base, id: 'verify-qb-unique', questions: [{ question: question('qb-unique-sc-1', 'Question bank only question'), sourceQuestionRef: 'Q1', assetSource: null }] });
  await publishQuestionBankBatch('verify-qb-unique');

  const second = await openPracticeSession({ topicSlug, subtopicSlug, questionCount: 5, questionTypes: ['single_choice'] }, owner);
  const bankMember = await prisma.practiceSessionQuestion.findFirstOrThrow({ where: { practiceSessionId: second.session.id, questionBankItemId: { not: null } } });
  assert.ok(bankMember.questionBankItemId);
  assert.equal(bankMember.examVersionQuestionId, null);
  assert.equal(second.session.questions.some((item) => item.question.content === 'Draft only question'), false, 'draft bank items are excluded');
  assertNoAnswerKey(second.session);

  await assert.rejects(() => prisma.questionBankItem.delete({ where: { id: bankMember.questionBankItemId! } }), 'pinned bank item is RESTRICT');
  await assert.rejects(() => prisma.practiceSessionQuestion.update({ where: { id: bankMember.id }, data: { questionBankItemId: null } }), 'exactly-one-source check holds');

  await importQuestionBank({ ...base, id: 'verify-qb-unique-revision-2', questions: [{ question: question('qb-unique-sc-1', 'Question bank only question revised'), sourceQuestionRef: 'Q1', assetSource: null }] });
  await publishQuestionBankBatch('verify-qb-unique-revision-2');
  const archived = await prisma.questionBankItem.findUniqueOrThrow({ where: { id: bankMember.questionBankItemId! } });
  assert.equal(archived.status, 'archived', 'new revision archives the previous published item');
  assert.ok(await getPracticeSession(second.session.id, owner), 'archived pinned bank revision remains resumable');

  const submitted = await submitPracticeSession(second.session.id, owner, randomUUID());
  assert.equal(submitted.session.status, 'completed');
  const published = await prisma.questionBankItem.findUniqueOrThrow({ where: { id: bankMember.questionBankItemId! } });
  await assert.rejects(() => prisma.questionBankItem.update({ where: { id: published.id }, data: { content: 'mutated' } }), 'published bank item is immutable');
  console.log('Question bank verification passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(disconnectPrisma);
