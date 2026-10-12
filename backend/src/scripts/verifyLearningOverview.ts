import assert from 'assert';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { createExamContentAttempt } from '../services/examContentAttemptService';
import { getLearningOverview } from '../services/learningOverviewService';

async function main(): Promise<void> {
  const suffix = Date.now().toString();
  const user = await prisma.user.create({ data: { email: `verify-learning-${suffix}@example.test`, authProvider: 'password', passwordHash: 'not-used' } });
  const examId = 'verify-v2-minimal-exam';
  const version = await prisma.examVersion.findFirstOrThrow({ where: { examId, status: 'published' }, select: { id: true, questions: { orderBy: { order: 'asc' }, take: 3, select: { id: true, type: true, topicSlug: true, subtopicSlug: true } } } });
  await createExamContentAttempt(examId, { examVersionId: version.id, responses: [{ questionId: 'sc-1', type: 'single_choice', choiceId: 'b' }, { questionId: 'tf-1', type: 'true_false_group', values: { a: true, b: false, c: true, d: true } }] }, user.id);
  const first = version.questions[0]!;
  const topic = await prisma.topic.findUniqueOrThrow({ where: { slug: first.topicSlug }, select: { id: true } });
  const subtopic = first.subtopicSlug === null ? null : await prisma.subtopic.findUnique({ where: { slug: first.subtopicSlug }, select: { id: true } });
  await prisma.practiceSession.create({ data: { userId: user.id, topicId: topic.id, subtopicId: subtopic?.id, requestedQuestionCount: 3, selectedQuestionTypes: version.questions.map((item) => item.type), selectionSeed: `verify-${suffix}`, status: 'completed', submittedAt: new Date(), totalQuestions: 3, scoreUnits: 25, maxScoreUnits: 175, fullyCorrectCount: 0, unansweredCount: 2, questions: { create: version.questions.map((question, index) => ({ order: index + 1, examVersionQuestionId: question.id, answer: { create: { response: index === 0 ? { choiceId: 'a' } : undefined, isFullyCorrect: false, awardedScoreUnits: index === 0 ? 25 : 0, maxScoreUnits: index === 1 ? 100 : 50 } } })) } } });
  const overview = await getLearningOverview(user.id);
  assert.equal(overview.coverage.examFactCount, 3);
  assert.equal(overview.coverage.practiceFactCount, 3);
  assert.equal(overview.overall.answeredCount, 3, 'unanswered facts must not increase confidence sample');
  assert.equal(overview.overall.maxScoreUnits, 375, 'exam and practice score units must aggregate directly');
  assert.equal(overview.overall.masteryPercent, 20, 'partial credit and unanswered facts must remain in mastery');
  assert.equal(overview.overall.confidence, 'low');
  assert.equal(overview.overall.status, 'developing');
  assert.equal(overview.recentActivity.length, 2);
  assert.equal(overview.recentActivity.some((item) => item.sourceType === 'practice'), true);
  assert.equal(JSON.stringify(overview).includes('answerKey'), false);
  console.log('Unified learning overview verification passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(disconnectPrisma);
