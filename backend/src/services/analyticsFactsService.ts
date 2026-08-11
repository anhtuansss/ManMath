import { prisma } from '../lib/prisma';
import { validateExamContentSnapshotV1 } from '../types/examContentSnapshotValidation';

export type AnalyticsConfidence = 'score_units' | 'legacy_best_effort' | 'mixed';

export type AnalyticsCoverageDto = {
  readonly scoreUnitAttemptCount: number;
  readonly legacyBestEffortAttemptCount: number;
  readonly unavailableV2AttemptCount: number;
};

export type AnalyticsFact = {
  readonly topicSlug: string | null;
  readonly subtopicSlug: string | null;
  readonly awardedScoreUnits: number | null;
  readonly maxScoreUnits: number | null;
  readonly isFullyCorrect: boolean;
  readonly source: 'score_units' | 'legacy_best_effort';
};

export type AnalyticsFactsResult = {
  readonly facts: readonly AnalyticsFact[];
  readonly coverage: AnalyticsCoverageDto;
};

/** V2 facts use submit-time snapshots; legacy mappings remain best-effort. */
export async function getUserAnalyticsFacts(userId: string): Promise<AnalyticsFactsResult> {
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    select: {
      scoringPolicy: true,
      contentSnapshotVersion: true,
      examContentSnapshot: true,
      answers: {
        select: {
          questionId: true,
          questionExternalId: true,
          awardedScoreUnits: true,
          maxScoreUnits: true,
          isFullyCorrect: true,
          isCorrect: true,
        },
      },
    },
  });

  const legacyQuestionIds = Array.from(new Set(
    attempts
      .filter((attempt) => attempt.scoringPolicy === null)
      .flatMap((attempt) => attempt.answers.map((answer) => answer.questionId)),
  ));
  const legacyQuestions = legacyQuestionIds.length === 0 ? [] : await prisma.question.findMany({
    where: { id: { in: legacyQuestionIds } },
    select: {
      id: true,
      topic: { select: { slug: true } },
      subtopic: { select: { slug: true } },
    },
  });
  const legacyTaxonomyByQuestionId = new Map(legacyQuestions.map((question) => [
    question.id,
    { topicSlug: question.topic?.slug ?? null, subtopicSlug: question.subtopic?.slug ?? null },
  ]));

  const facts: AnalyticsFact[] = [];
  let scoreUnitAttemptCount = 0;
  let legacyBestEffortAttemptCount = 0;
  let unavailableV2AttemptCount = 0;

  for (const attempt of attempts) {
    if (attempt.scoringPolicy === null) {
      legacyBestEffortAttemptCount += 1;
      for (const answer of attempt.answers) {
        const taxonomy = legacyTaxonomyByQuestionId.get(answer.questionId);
        facts.push({
          topicSlug: taxonomy?.topicSlug ?? null,
          subtopicSlug: taxonomy?.subtopicSlug ?? null,
          awardedScoreUnits: null,
          maxScoreUnits: null,
          isFullyCorrect: answer.isCorrect,
          source: 'legacy_best_effort',
        });
      }
      continue;
    }

    if (attempt.contentSnapshotVersion !== 1 || attempt.examContentSnapshot === null) {
      unavailableV2AttemptCount += 1;
      continue;
    }

    const snapshotResult = validateExamContentSnapshotV1(attempt.examContentSnapshot);
    if (!snapshotResult.ok) {
      unavailableV2AttemptCount += 1;
      continue;
    }

    const questionByExternalId = new Map<string, (typeof snapshotResult.value.questions)[number]>(
      snapshotResult.value.questions.map((question) => [question.id as string, question]),
    );
    const attemptFacts: AnalyticsFact[] = [];
    let complete = attempt.answers.length === questionByExternalId.size;

    for (const answer of attempt.answers) {
      const question = answer.questionExternalId === null
        ? undefined
        : questionByExternalId.get(answer.questionExternalId);
      if (
        question === undefined ||
        answer.awardedScoreUnits === null ||
        answer.maxScoreUnits === null ||
        answer.isFullyCorrect === null
      ) {
        complete = false;
        break;
      }

      attemptFacts.push({
        topicSlug: question.topicSlug,
        subtopicSlug: question.subtopicSlug ?? null,
        awardedScoreUnits: answer.awardedScoreUnits,
        maxScoreUnits: answer.maxScoreUnits,
        isFullyCorrect: answer.isFullyCorrect,
        source: 'score_units',
      });
    }

    if (!complete) {
      unavailableV2AttemptCount += 1;
      continue;
    }

    scoreUnitAttemptCount += 1;
    facts.push(...attemptFacts);
  }

  return {
    facts,
    coverage: { scoreUnitAttemptCount, legacyBestEffortAttemptCount, unavailableV2AttemptCount },
  };
}

export function getAnalyticsConfidence(
  scoreFactCount: number,
  legacyFactCount: number,
): AnalyticsConfidence {
  if (scoreFactCount > 0 && legacyFactCount > 0) return 'mixed';
  return scoreFactCount > 0 ? 'score_units' : 'legacy_best_effort';
}
