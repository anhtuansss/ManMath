import { prisma } from '../lib/prisma';
import { validateExamContentSnapshotV1 } from '../types/examContentSnapshotValidation';

export type AnalyticsCoverageDto = {
  readonly scoreUnitAttemptCount: number;
  readonly unavailableV2AttemptCount: number;
};

export type AnalyticsFact = {
  readonly topicSlug: string | null;
  readonly subtopicSlug: string | null;
  readonly awardedScoreUnits: number;
  readonly maxScoreUnits: number;
  readonly isFullyCorrect: boolean;
};

export type AnalyticsFactsResult = {
  readonly facts: readonly AnalyticsFact[];
  readonly coverage: AnalyticsCoverageDto;
};

/** Only complete V2 submit-time snapshots form analytics facts; invalid rows are excluded. */
export async function getUserAnalyticsFacts(userId: string): Promise<AnalyticsFactsResult> {
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    select: {
      scoringPolicy: true,
      contentSnapshotVersion: true,
      examContentSnapshot: true,
      answers: {
        select: {
          questionExternalId: true,
          awardedScoreUnits: true,
          maxScoreUnits: true,
          isFullyCorrect: true,
          isCorrect: true,
        },
      },
    },
  });

  const facts: AnalyticsFact[] = [];
  let scoreUnitAttemptCount = 0;
  let unavailableV2AttemptCount = 0;

  for (const attempt of attempts) {
    if (attempt.scoringPolicy !== 'vietnam_thpt_math_2025') continue;

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
    coverage: { scoreUnitAttemptCount, unavailableV2AttemptCount },
  };
}
