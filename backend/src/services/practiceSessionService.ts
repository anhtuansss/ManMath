import { Prisma, QuestionType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import type { PublicQuestion, QuestionInput, SubmittedResponse } from '../types/examContent';
import type { PracticeSessionDto } from '../types/examContentApi';
import { gradeQuestionSet } from './examContentGradingService';
import { maximumQuestionScore } from './examGrading';
import { validateQuestionInput } from '../types/examContentValidation';

const TYPES: readonly QuestionType[] = ['single_choice', 'true_false_group', 'short_answer'];
const COUNTS = new Set([5, 10]);
export class PracticeSessionRequestError extends Error {}
export class PracticeSessionConflictError extends Error {}
export class PracticeSessionNoMatchingQuestionsError extends PracticeSessionRequestError { readonly code = 'PRACTICE_NO_MATCHING_QUESTIONS'; }
type RecordQuestion = { id: string; externalId: string; examVersionId: string; type: QuestionInput['type']; section: number; order: number; content: string; topicSlug: string; subtopicSlug: string | null; assets: Prisma.JsonValue | null; choices: Prisma.JsonValue | null; statements: Prisma.JsonValue | null; answerKey: Prisma.JsonValue };
type Configuration = { topicSlug: string; subtopicSlug: string | null; questionCount: number; questionTypes: readonly QuestionType[] };

function question(record: RecordQuestion): QuestionInput {
  const parsed = validateQuestionInput({ id: record.externalId, type: record.type, section: record.section, order: record.order, content: record.content, topicSlug: record.topicSlug, ...(record.subtopicSlug === null ? {} : { subtopicSlug: record.subtopicSlug }), ...(record.assets === null ? {} : { assets: record.assets }), ...(record.choices === null ? {} : { choices: record.choices }), ...(record.statements === null ? {} : { statements: record.statements }), answerKey: record.answerKey });
  if (!parsed.ok) throw new PracticeSessionRequestError(`Pinned question is invalid: ${parsed.message}`);
  return parsed.value;
}
function publicQuestion(value: QuestionInput) { const { answerKey: _answerKey, ...safe } = value; return safe; }
function response(value: Prisma.JsonValue | null, item: QuestionInput): SubmittedResponse | null {
  if (value === null) return null; const raw = value as Record<string, unknown>;
  if (raw.type !== item.type) throw new PracticeSessionRequestError('Pinned response is invalid');
  if (item.type === 'single_choice' && typeof raw.choiceId === 'string') return { type: 'single_choice', choiceId: raw.choiceId as never };
  if (item.type === 'short_answer' && typeof raw.response === 'string') return { type: 'short_answer', response: raw.response as never };
  if (item.type === 'true_false_group' && typeof raw.values === 'object' && raw.values !== null) return { type: 'true_false_group', values: raw.values as Record<never, boolean> };
  throw new PracticeSessionRequestError('Pinned response is invalid');
}
function normalizedResponse(value: unknown, item: QuestionInput): SubmittedResponse | null {
  if (value === null) return null;
  if (typeof value !== 'object' || value === null) throw new PracticeSessionRequestError('Pinned response is invalid');
  const graded = gradeQuestionSet([item], { responses: [{ questionId: item.id, ...(value as Record<string, unknown>) } as never] });
  if (graded.results[0]?.response === undefined) throw new PracticeSessionRequestError('Pinned response is invalid');
  return graded.results[0].response;
}
function configuration(raw: unknown): Configuration {
  if (typeof raw !== 'object' || raw === null) throw new PracticeSessionRequestError('Practice configuration is invalid');
  const body = raw as Record<string, unknown>; const topicSlug = typeof body.topicSlug === 'string' ? body.topicSlug.trim() : '';
  const subtopicSlug = body.subtopicSlug === undefined || body.subtopicSlug === null ? null : typeof body.subtopicSlug === 'string' ? body.subtopicSlug.trim() : '';
  if (!topicSlug || (subtopicSlug !== null && !subtopicSlug)) throw new PracticeSessionRequestError('topicSlug/subtopicSlug is invalid');
  if (!Number.isInteger(body.questionCount) || !COUNTS.has(body.questionCount as number)) throw new PracticeSessionRequestError('questionCount must be 5 or 10');
  if (!Array.isArray(body.questionTypes) || body.questionTypes.length === 0) throw new PracticeSessionRequestError('questionTypes must be a non-empty array');
  if (body.questionTypes.some((type) => typeof type !== 'string' || !TYPES.includes(type as QuestionType))) throw new PracticeSessionRequestError('questionTypes contains an invalid type');
  const selected = new Set(body.questionTypes as QuestionType[]);
  if (selected.size !== body.questionTypes.length) throw new PracticeSessionRequestError('questionTypes must not contain duplicates');
  return { topicSlug, subtopicSlug, questionCount: body.questionCount as number, questionTypes: TYPES.filter((type) => selected.has(type)) };
}
function rank(seed: string, id: string): string { return createHash('sha256').update(`${seed}:${id}`).digest('hex'); }

async function dto(sessionId: string, userId: string): Promise<PracticeSessionDto | null> {
  const session = await prisma.practiceSession.findFirst({ where: { id: sessionId, userId }, include: { topic: { select: { slug: true, name: true } }, subtopic: { select: { slug: true, name: true } }, questions: { orderBy: { order: 'asc' }, include: { answer: true, examVersionQuestion: true } } } });
  if (!session) return null;
  return { id: session.id, status: session.status, topic: session.topic, startedAt: session.startedAt.toISOString(), submittedAt: session.submittedAt?.toISOString() ?? null, scoreUnits: session.scoreUnits as never, maxScoreUnits: session.maxScoreUnits as never, fullyCorrectCount: session.fullyCorrectCount, totalQuestions: session.totalQuestions, unansweredCount: session.unansweredCount, configuration: { topicSlug: session.topic.slug, subtopicSlug: session.subtopic?.slug ?? null, requestedQuestionCount: session.requestedQuestionCount, actualQuestionCount: session.totalQuestions, questionTypes: session.selectedQuestionTypes }, questions: session.questions.map((entry) => { const q = question(entry.examVersionQuestion); const answer = entry.answer; const result = session.status === 'completed' && answer !== null && answer.isFullyCorrect !== null && answer.awardedScoreUnits !== null && answer.maxScoreUnits !== null ? { result: { isFullyCorrect: answer.isFullyCorrect, awardedScoreUnits: answer.awardedScoreUnits as never, maxScoreUnits: answer.maxScoreUnits as never } } : {}; return { sessionQuestionId: entry.id, order: entry.order, question: { ...publicQuestion(q), id: entry.id as PublicQuestion['id'] } as PublicQuestion, response: answer ? response(answer.response, q) : null, responseRevision: answer?.responseRevision ?? 0, ...result }; }) };
}

export async function getActivePracticeSession(topicSlug: string, userId: string): Promise<PracticeSessionDto | null> {
  const topic = await prisma.topic.findUnique({ where: { slug: topicSlug }, select: { id: true } }); if (!topic) return null;
  const active = await prisma.practiceSession.findFirst({ where: { userId, topicId: topic.id, status: 'in_progress' }, select: { id: true } }); return active ? dto(active.id, userId) : null;
}
export async function openPracticeSession(raw: unknown, userId: string): Promise<{ session: PracticeSessionDto; created: boolean }> {
  if (typeof raw !== 'object' || raw === null || typeof (raw as Record<string, unknown>).topicSlug !== 'string') throw new PracticeSessionRequestError('topicSlug is invalid');
  const topicSlug = ((raw as Record<string, unknown>).topicSlug as string).trim(); const topic = await prisma.topic.findUnique({ where: { slug: topicSlug }, select: { id: true } }); if (!topic) throw new PracticeSessionRequestError('Topic not found');
  const active = await prisma.practiceSession.findFirst({ where: { userId, topicId: topic.id, status: 'in_progress' }, select: { id: true } }); if (active) return { session: (await dto(active.id, userId))!, created: false };
  const config = configuration(raw); const subtopic = config.subtopicSlug === null ? null : await prisma.subtopic.findFirst({ where: { slug: config.subtopicSlug, topicId: topic.id }, select: { id: true } }); if (config.subtopicSlug !== null && !subtopic) throw new PracticeSessionRequestError('subtopicSlug does not belong to topicSlug');
  const selectionSeed = randomBytes(24).toString('base64url'); const eligible = await prisma.examVersionQuestion.findMany({ where: { topicSlug, ...(config.subtopicSlug === null ? {} : { subtopicSlug: config.subtopicSlug }), type: { in: [...config.questionTypes] }, examVersion: { status: 'published' } }, select: { id: true } });
  if (eligible.length === 0) throw new PracticeSessionNoMatchingQuestionsError('No published questions match this practice configuration');
  const selected = eligible.sort((a, b) => rank(selectionSeed, a.id).localeCompare(rank(selectionSeed, b.id))).slice(0, config.questionCount);
  try {
    const created = await prisma.practiceSession.create({ data: { userId, topicId: topic.id, subtopicId: subtopic?.id, requestedQuestionCount: config.questionCount, selectedQuestionTypes: [...config.questionTypes], selectionSeed, totalQuestions: selected.length, questions: { create: selected.map((item, index) => ({ order: index + 1, examVersionQuestionId: item.id, answer: { create: {} } })) } }, select: { id: true } }); return { session: (await dto(created.id, userId))!, created: true };
  } catch (error) { const winner = await prisma.practiceSession.findFirst({ where: { userId, topicId: topic.id, status: 'in_progress' }, select: { id: true } }); if (winner) return { session: (await dto(winner.id, userId))!, created: false }; throw error; }
}
export async function getPracticeSession(sessionId: string, userId: string): Promise<PracticeSessionDto | null> { return dto(sessionId, userId); }
export async function cancelPracticeSession(sessionId: string, userId: string): Promise<void> { const updated = await prisma.practiceSession.updateMany({ where: { id: sessionId, userId, status: 'in_progress' }, data: { status: 'cancelled' } }); if (updated.count !== 1) throw new PracticeSessionConflictError('Only an in-progress practice session can be cancelled'); }
export async function savePracticeSessionResponse(sessionId: string, questionId: string, userId: string, raw: unknown, expectedRevision: unknown): Promise<{ response: SubmittedResponse | null; responseRevision: number }> {
  if (!Number.isInteger(expectedRevision) || typeof expectedRevision !== 'number' || expectedRevision < 0) throw new PracticeSessionRequestError('expectedRevision is invalid');
  const item = await prisma.practiceSessionQuestion.findFirst({ where: { id: questionId, practiceSessionId: sessionId, practiceSession: { userId, status: 'in_progress' } }, include: { answer: true, examVersionQuestion: true } }); if (!item?.answer) throw new PracticeSessionConflictError('Practice session is unavailable');
  const q = question(item.examVersionQuestion); const next = normalizedResponse(raw, q); const current = response(item.answer.response, q); if (item.answer.responseRevision !== expectedRevision) { if (JSON.stringify(current) === JSON.stringify(next)) return { response: current, responseRevision: item.answer.responseRevision }; throw new PracticeSessionConflictError('Practice answer was changed elsewhere'); }
  const updated = await prisma.practiceSessionAnswer.update({ where: { practiceSessionQuestionId: item.id }, data: { response: next === null ? Prisma.DbNull : JSON.parse(JSON.stringify(next)), responseRevision: { increment: 1 } }, select: { response: true, responseRevision: true } }); return { response: response(updated.response, q), responseRevision: updated.responseRevision };
}
export async function submitPracticeSession(sessionId: string, userId: string, key: string): Promise<{ session: PracticeSessionDto; replayed: boolean }> {
  const current = await prisma.practiceSession.findFirst({ where: { id: sessionId, userId }, select: { status: true, submitIdempotencyKey: true } }); if (!current) throw new PracticeSessionRequestError('Practice session not found'); if (current.status === 'completed') { if (current.submitIdempotencyKey !== key) throw new PracticeSessionConflictError('Practice session is already completed'); return { session: (await dto(sessionId, userId))!, replayed: true }; } if (current.status !== 'in_progress') throw new PracticeSessionConflictError('Practice session is unavailable');
  const stored = await prisma.practiceSession.findUnique({ where: { id: sessionId }, include: { questions: { orderBy: { order: 'asc' }, include: { answer: true, examVersionQuestion: true } } } }); if (!stored) throw new PracticeSessionRequestError('Practice session not found'); const questions = stored.questions.map((item) => question(item.examVersionQuestion)); const responses = stored.questions.flatMap((item, index) => { const saved = response(item.answer?.response ?? null, questions[index]!); return saved === null ? [] : [{ questionId: questions[index]!.id, ...saved }]; }); const grading = gradeQuestionSet(questions, { responses }); const byId = new Map(grading.results.map((item) => [item.questionId, item]));
  try { await prisma.$transaction(async (tx) => { for (const item of stored.questions) { const result = byId.get(question(item.examVersionQuestion).id)!; await tx.practiceSessionAnswer.update({ where: { practiceSessionQuestionId: item.id }, data: { isFullyCorrect: result.isCorrect, awardedScoreUnits: result.awardedScore, maxScoreUnits: maximumQuestionScore(question(item.examVersionQuestion)) } }); } const changed = await tx.practiceSession.updateMany({ where: { id: sessionId, userId, status: 'in_progress' }, data: { status: 'completed', submittedAt: new Date(), scoreUnits: grading.totalAwardedScore, maxScoreUnits: questions.reduce((sum, item) => sum + maximumQuestionScore(item), 0), fullyCorrectCount: grading.results.filter((item) => item.isCorrect).length, unansweredCount: grading.results.filter((item) => item.response === undefined).length, submitIdempotencyKey: key, submissionFingerprint: createHash('sha256').update(`${userId}:${sessionId}`).digest('hex') } }); if (changed.count !== 1) throw new PracticeSessionConflictError('Practice session was submitted concurrently'); }); return { session: (await dto(sessionId, userId))!, replayed: false }; } catch (error) { const winner = await prisma.practiceSession.findFirst({ where: { id: sessionId, userId }, select: { status: true, submitIdempotencyKey: true } }); if (winner?.status === 'completed' && winner.submitIdempotencyKey === key) return { session: (await dto(sessionId, userId))!, replayed: true }; if (winner?.status !== 'in_progress') throw new PracticeSessionConflictError('Practice session is unavailable'); throw error; }
}
