import { QuestionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { validateExamContentSnapshotV1 } from '../types/examContentSnapshotValidation';

export type AnalyticsCoverageDto = { readonly scoreUnitAttemptCount: number; readonly unavailableV2AttemptCount: number };
export type LearningFactSource = 'exam' | 'practice';

/** A completed persisted outcome; analytics never re-grades this record. */
export type AnalyticsFact = {
  readonly sourceType: LearningFactSource; readonly submittedAt: Date;
  readonly topicSlug: string | null; readonly subtopicSlug: string | null;
  readonly questionType: QuestionType; readonly isAnswered: boolean;
  readonly awardedScoreUnits: number; readonly maxScoreUnits: number; readonly isFullyCorrect: boolean;
};
export type AnalyticsFactsResult = { readonly facts: readonly AnalyticsFact[]; readonly coverage: AnalyticsCoverageDto };

export async function getUserAnalyticsFacts(userId: string): Promise<AnalyticsFactsResult> {
  const [attempts, sessions] = await Promise.all([
    prisma.attempt.findMany({ where: { userId }, select: {
      scoringPolicy: true, submittedAt: true, contentSnapshotVersion: true, examContentSnapshot: true,
      answers: { select: { questionExternalId: true, questionType: true, response: true, awardedScoreUnits: true, maxScoreUnits: true, isFullyCorrect: true } },
    } }),
    prisma.practiceSession.findMany({ where: { userId, status: 'completed', submittedAt: { not: null } }, select: {
      submittedAt: true,
      questions: { select: {
        examVersionQuestion: { select: { topicSlug: true, subtopicSlug: true, type: true } },
        questionBankItem: { select: { type: true, topic: { select: { slug: true } }, subtopic: { select: { slug: true } } } },
        answer: { select: { response: true, awardedScoreUnits: true, maxScoreUnits: true, isFullyCorrect: true } },
      } },
    } }),
  ]);
  const facts: AnalyticsFact[] = [];
  let scoreUnitAttemptCount = 0;
  let unavailableV2AttemptCount = 0;
  for (const attempt of attempts) {
    if (attempt.scoringPolicy !== 'vietnam_thpt_math_2025') continue;
    if (attempt.contentSnapshotVersion !== 1 || attempt.examContentSnapshot === null) { unavailableV2AttemptCount += 1; continue; }
    const snapshot = validateExamContentSnapshotV1(attempt.examContentSnapshot);
    if (!snapshot.ok) { unavailableV2AttemptCount += 1; continue; }
    const questions = new Map(snapshot.value.questions.map((question) => [question.id as string, question]));
    const attemptFacts: AnalyticsFact[] = [];
    let complete = attempt.answers.length === questions.size;
    for (const answer of attempt.answers) {
      const question = answer.questionExternalId === null ? undefined : questions.get(answer.questionExternalId);
      if (!question || answer.awardedScoreUnits === null || answer.maxScoreUnits === null || answer.isFullyCorrect === null) { complete = false; break; }
      attemptFacts.push({ sourceType: 'exam', submittedAt: attempt.submittedAt, topicSlug: question.topicSlug, subtopicSlug: question.subtopicSlug ?? null, questionType: question.type, isAnswered: answer.response !== null, awardedScoreUnits: answer.awardedScoreUnits, maxScoreUnits: answer.maxScoreUnits, isFullyCorrect: answer.isFullyCorrect });
    }
    if (!complete) { unavailableV2AttemptCount += 1; continue; }
    scoreUnitAttemptCount += 1; facts.push(...attemptFacts);
  }
  for (const session of sessions) {
    if (session.submittedAt === null) continue;
    for (const entry of session.questions) {
      const source = entry.examVersionQuestion ?? (entry.questionBankItem === null ? null : { topicSlug: entry.questionBankItem.topic.slug, subtopicSlug: entry.questionBankItem.subtopic.slug, type: entry.questionBankItem.type });
      const answer = entry.answer;
      if (source === null || answer === null || answer.awardedScoreUnits === null || answer.maxScoreUnits === null || answer.isFullyCorrect === null) continue;
      facts.push({ sourceType: 'practice', submittedAt: session.submittedAt, topicSlug: source.topicSlug, subtopicSlug: source.subtopicSlug, questionType: source.type, isAnswered: answer.response !== null, awardedScoreUnits: answer.awardedScoreUnits, maxScoreUnits: answer.maxScoreUnits, isFullyCorrect: answer.isFullyCorrect });
    }
  }
  return { facts, coverage: { scoreUnitAttemptCount, unavailableV2AttemptCount } };
}
