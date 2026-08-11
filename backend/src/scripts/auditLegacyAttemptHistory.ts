import { disconnectPrisma, prisma } from '../lib/prisma';

type AuditBucket = 'score_units_exact' | 'legacy_best_effort' | 'unavailable';

type AuditReport = {
  readonly totalAttempts: number;
  readonly buckets: Readonly<Record<AuditBucket, number>>;
  readonly notes: readonly string[];
};

/**
 * Read-only audit. It deliberately does not generate external IDs, answer keys,
 * or score-unit facts for old rows: those would claim a submit-time truth that
 * the historical persistence cannot prove.
 */
async function main(): Promise<void> {
  const attempts = await prisma.attempt.findMany({
    select: {
      id: true,
      scoringPolicy: true,
      examVersionId: true,
      contentSnapshotVersion: true,
      examContentSnapshot: true,
      answers: { select: { awardedScoreUnits: true, maxScoreUnits: true } },
    },
  });

  const buckets: Record<AuditBucket, number> = {
    score_units_exact: 0,
    legacy_best_effort: 0,
    unavailable: 0,
  };
  const unavailableIds: string[] = [];

  for (const attempt of attempts) {
    const hasCompleteScoreFacts = attempt.answers.length > 0 && attempt.answers.every(
      (answer) => answer.awardedScoreUnits !== null && answer.maxScoreUnits !== null,
    );
    const hasExactV2Identity =
      attempt.scoringPolicy === 'vietnam_thpt_math_2025' &&
      attempt.examVersionId !== null &&
      attempt.contentSnapshotVersion === 1 &&
      attempt.examContentSnapshot !== null &&
      hasCompleteScoreFacts;

    if (hasExactV2Identity) {
      buckets.score_units_exact += 1;
    } else if (attempt.scoringPolicy === null) {
      // Existing legacy metrics remain visible only as best effort; they are
      // never transformed into V2 mastery facts by this audit.
      buckets.legacy_best_effort += 1;
    } else {
      buckets.unavailable += 1;
      unavailableIds.push(attempt.id);
    }
  }

  const report: AuditReport = {
    totalAttempts: attempts.length,
    buckets,
    notes: [
      'score_units_exact: immutable V2 version, snapshot, and per-question score facts are all persisted.',
      'legacy_best_effort: keep existing legacy metrics; no historical answer-key or stable-ID truth is fabricated.',
      'unavailable: a purported V2 attempt lacks enough persisted facts for exact reconstruction and remains excluded from V2 analytics.',
    ],
  };

  console.log(JSON.stringify(report, null, 2));
  if (unavailableIds.length > 0) {
    console.log(`Unavailable attempt IDs (no rewrite performed): ${unavailableIds.join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error('Legacy history audit failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
