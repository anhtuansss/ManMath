import assert from 'assert';
import { createHash } from 'crypto';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { assertVerificationDatabase } from '../config/verificationDatabase';
import { cancelPracticeSession, openPracticeSession, PracticeSessionNoMatchingQuestionsError, PracticeSessionRequestError } from '../services/practiceSessionService';

const slug = 'ham-so-va-do-thi-nen-tang';
const subtopic = 'ham-so-va-tap-xac-dinh';
async function user(label: string): Promise<string> { return (await prisma.user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@example.test`, authProvider: 'password', passwordHash: 'verification-only' } })).id; }
const config = { topicSlug: slug, subtopicSlug: subtopic, questionCount: 5, questionTypes: ['true_false_group', 'single_choice'] };

async function main(): Promise<void> {
  assertVerificationDatabase();
  const owner = await user('practice-config');
  const started = await openPracticeSession(config, owner);
  assert.equal(started.created, true);
  assert.deepEqual(started.session.configuration.questionTypes, ['single_choice', 'true_false_group'], 'types are canonicalized');
  assert.equal(started.session.configuration.subtopicSlug, subtopic);
  assert.equal(started.session.configuration.requestedQuestionCount, 5);
  assert.ok(started.session.configuration.actualQuestionCount > 0 && started.session.configuration.actualQuestionCount < 5, 'insufficient pool is explicit and never duplicated');
  assert.equal(started.session.questions[0]?.question.type, 'single_choice');
  assert.equal(new Set(started.session.questions.map((item) => item.sessionQuestionId)).size, started.session.questions.length);
  const resumed = await openPracticeSession({ topicSlug: slug, questionCount: 10, questionTypes: ['short_answer'] }, owner);
  assert.equal(resumed.created, false); assert.equal(resumed.session.id, started.session.id); assert.deepEqual(resumed.session.configuration, started.session.configuration, 'active session config is never replaced');
  const persisted = await prisma.practiceSession.findUniqueOrThrow({ where: { id: started.session.id }, include: { questions: true } });
  const eligible = await prisma.examVersionQuestion.findMany({ where: { topicSlug: slug, subtopicSlug: subtopic, type: { in: ['single_choice', 'true_false_group'] }, examVersion: { status: 'published' } }, select: { id: true } });
  const expected = eligible.sort((a, b) => createHash('sha256').update(`${persisted.selectionSeed}:${a.id}`).digest('hex').localeCompare(createHash('sha256').update(`${persisted.selectionSeed}:${b.id}`).digest('hex'))).slice(0, 5).map((item) => item.id);
  assert.deepEqual(persisted.questions.sort((a, b) => a.order - b.order).map((item) => item.examVersionQuestionId), expected, 'stored seed deterministically reproduces membership');
  const badPair = await user('bad-pair'); const badCount = await user('bad-count'); const badTypes = await user('bad-types'); const emptyPool = await user('empty-pool');
  await assert.rejects(() => openPracticeSession({ topicSlug: slug, subtopicSlug: 'cap-so-cong', questionCount: 5, questionTypes: ['single_choice'] }, badPair), (error: unknown) => error instanceof PracticeSessionRequestError);
  await assert.rejects(() => openPracticeSession({ topicSlug: slug, questionCount: 7, questionTypes: ['single_choice'] }, badCount), (error: unknown) => error instanceof PracticeSessionRequestError);
  await assert.rejects(() => openPracticeSession({ topicSlug: slug, questionCount: 5, questionTypes: ['single_choice', 'single_choice'] }, badTypes), (error: unknown) => error instanceof PracticeSessionRequestError);
  await assert.rejects(() => openPracticeSession({ topicSlug: slug, subtopicSlug: subtopic, questionCount: 5, questionTypes: ['short_answer'] }, emptyPool), (error: unknown) => error instanceof PracticeSessionNoMatchingQuestionsError && error.code === 'PRACTICE_NO_MATCHING_QUESTIONS');
  await cancelPracticeSession(started.session.id, owner);
  const cancelled = await prisma.practiceSession.findUniqueOrThrow({ where: { id: started.session.id } }); assert.equal(cancelled.status, 'cancelled');
  await assert.rejects(() => prisma.practiceSession.update({ where: { id: started.session.id }, data: { requestedQuestionCount: 10 } }));
  await assert.rejects(() => prisma.practiceSessionAnswer.update({ where: { practiceSessionQuestionId: persisted.questions[0]!.id }, data: { responseRevision: 2 } }));
  const next = await openPracticeSession(config, owner); assert.equal(next.created, true); assert.notEqual(next.session.id, started.session.id);
  console.log('Practice configuration verification passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(disconnectPrisma);
