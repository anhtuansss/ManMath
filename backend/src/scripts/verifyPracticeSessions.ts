import assert from 'assert';
import { randomUUID } from 'crypto';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { assertVerificationDatabase } from '../config/verificationDatabase';
import {
  getPracticeSession,
  openPracticeSession,
  PracticeSessionConflictError,
  savePracticeSessionResponse,
  submitPracticeSession,
} from '../services/practiceSessionService';

const forbidden = new Set(['answerKey', 'correctAnswer', 'correctChoiceId', 'tolerance']);
function assertSafe(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(assertSafe);
  if (value === null || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(forbidden.has(key), false, `Unexpected answer field: ${key}`);
    assertSafe(nested);
  }
}

async function user(label: string): Promise<string> {
  const record = await prisma.user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@example.test`, authProvider: 'password', passwordHash: 'verification-only' } });
  return record.id;
}

async function main(): Promise<void> {
  assertVerificationDatabase();
  const owner = await user('practice-owner');
  const other = await user('practice-other');
  const slug = 'ham-so-va-do-thi-nen-tang';

  const config = { topicSlug: slug, subtopicSlug: 'ham-so-va-tap-xac-dinh', questionCount: 5, questionTypes: ['short_answer', 'single_choice', 'true_false_group'] };
  const opened = await openPracticeSession(config, owner);
  assert.equal(opened.created, true);
  assert.equal(opened.session.status, 'in_progress');
  assert.ok(opened.session.questions.length > 0);
  assertSafe(JSON.parse(JSON.stringify(opened.session)) as unknown);
  const resumed = await openPracticeSession({ topicSlug: slug, questionCount: 10, questionTypes: ['single_choice'] }, owner);
  assert.equal(resumed.created, false);
  assert.equal(resumed.session.id, opened.session.id);
  assert.equal(await getPracticeSession(opened.session.id, other), null, 'owner isolation');

  const concurrentOwner = await user('practice-concurrent');
  const concurrent = await Promise.all([openPracticeSession(config, concurrentOwner), openPracticeSession(config, concurrentOwner)]);
  assert.equal(concurrent[0].session.id, concurrent[1].session.id, 'one active session wins concurrent start');
  assert.equal(await prisma.practiceSession.count({ where: { userId: concurrentOwner, status: 'in_progress' } }), 1);

  const first = opened.session.questions.find((item) => item.question.type === 'single_choice');
  assert.ok(first, 'fixture must contain a pinned single-choice question');
  if (!first) throw new Error('Pinned single-choice question is required');
  const saved = await savePracticeSessionResponse(opened.session.id, first.sessionQuestionId, owner, { type: 'single_choice', choiceId: 'a' }, 0);
  assert.equal(saved.responseRevision, 1);
  assert.equal(saved.response?.type, 'single_choice');
  const retry = await savePracticeSessionResponse(opened.session.id, first.sessionQuestionId, owner, { type: 'single_choice', choiceId: 'a' }, 0);
  assert.equal(retry.responseRevision, 1, 'same response retry is idempotent');
  await assert.rejects(
    () => savePracticeSessionResponse(opened.session.id, first.sessionQuestionId, owner, { type: 'single_choice', choiceId: 'b' }, 0),
    (error: unknown) => error instanceof PracticeSessionConflictError,
  );
  const cleared = await savePracticeSessionResponse(opened.session.id, first.sessionQuestionId, owner, null, 1);
  assert.equal(cleared.response, null);

  const membership = await prisma.practiceSessionQuestion.findUniqueOrThrow({ where: { id: first.sessionQuestionId } });
  assert.ok(membership.examVersionQuestionId, 'fixture session must pin an exam question');
  const pinnedExamQuestionId = membership.examVersionQuestionId;
  await assert.rejects(() => prisma.practiceSessionQuestion.update({ where: { id: membership.id }, data: { order: 99 } }));
  await assert.rejects(() => prisma.examVersionQuestion.delete({ where: { id: pinnedExamQuestionId } }), 'pinned FK is RESTRICT');

  await prisma.examVersion.update({ where: { id: (await prisma.examVersionQuestion.findUniqueOrThrow({ where: { id: pinnedExamQuestionId } })).examVersionId }, data: { status: 'archived' } });
  assert.ok(await getPracticeSession(opened.session.id, owner), 'archived source remains readable');

  const key = randomUUID();
  const submits = await Promise.all([submitPracticeSession(opened.session.id, owner, key), submitPracticeSession(opened.session.id, owner, key)]);
  assert.equal(submits.filter((result) => !result.replayed).length, 1, 'one submit commits');
  assert.equal(submits.filter((result) => result.replayed).length, 1, 'other submit replays');
  const completed = await getPracticeSession(opened.session.id, owner);
  assert.equal(completed?.status, 'completed');
  assertSafe(JSON.parse(JSON.stringify(completed)) as unknown);
  await assert.rejects(() => savePracticeSessionResponse(opened.session.id, first.sessionQuestionId, owner, null, 2));
  await assert.rejects(() => prisma.practiceSession.update({ where: { id: opened.session.id }, data: { scoreUnits: 999 } }));
  await assert.rejects(() => prisma.practiceSessionAnswer.update({ where: { practiceSessionQuestionId: first.sessionQuestionId }, data: { responseRevision: 99 } }));
  const replay = await submitPracticeSession(opened.session.id, owner, key);
  assert.equal(replay.replayed, true);
  await assert.rejects(() => submitPracticeSession(opened.session.id, owner, randomUUID()), (error: unknown) => error instanceof PracticeSessionConflictError);
  console.log('Practice session verification passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(disconnectPrisma);
