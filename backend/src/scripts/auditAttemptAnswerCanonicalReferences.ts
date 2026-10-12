import { disconnectPrisma, prisma } from '../lib/prisma';

type CanonicalReferenceAudit = {
  readonly total: number;
  readonly populated: number;
  readonly orphaned: number;
  readonly wrongVersion: number;
  readonly externalIdMismatch: number;
  readonly duplicateAttemptQuestion: number;
};

/** Read-only guard for the canonical V2 AttemptAnswer identity. */
async function main(): Promise<void> {
  const answers = await prisma.attemptAnswer.findMany({
    select: {
      attemptId: true,
      questionExternalId: true,
      examVersionQuestionId: true,
      attempt: {
        select: { examVersionId: true },
      },
      examVersionQuestion: {
        select: {
          examVersionId: true,
          externalId: true,
        },
      },
    },
  });
  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();
  let populated = 0;
  let orphaned = 0;
  let wrongVersion = 0;
  let externalIdMismatch = 0;

  for (const answer of answers) {
    if (answer.examVersionQuestionId === null) {
      continue;
    }
    populated += 1;

    const duplicateKey = `${answer.attemptId}\u0000${answer.examVersionQuestionId}`;
    if (seenKeys.has(duplicateKey)) duplicateKeys.add(duplicateKey);
    seenKeys.add(duplicateKey);

    if (answer.examVersionQuestion === null) {
      orphaned += 1;
      continue;
    }
    if (
      answer.attempt.examVersionId === null ||
      answer.examVersionQuestion.examVersionId !== answer.attempt.examVersionId
    ) {
      wrongVersion += 1;
    }
    if (
      answer.questionExternalId === null ||
      answer.examVersionQuestion.externalId !== answer.questionExternalId
    ) {
      externalIdMismatch += 1;
    }
  }

  const audit: CanonicalReferenceAudit = {
    total: answers.length,
    populated,
    orphaned,
    wrongVersion,
    externalIdMismatch,
    duplicateAttemptQuestion: duplicateKeys.size,
  };

  if (
    audit.populated !== audit.total ||
    audit.orphaned !== 0 ||
    audit.wrongVersion !== 0 ||
    audit.externalIdMismatch !== 0 ||
    audit.duplicateAttemptQuestion !== 0
  ) {
    throw new Error(`Canonical V2 reference audit failed: ${JSON.stringify(audit)}`);
  }

  console.log(`AttemptAnswer canonical-reference audit passed: ${JSON.stringify(audit)}`);
}

main()
  .catch((error) => {
    console.error('AttemptAnswer canonical-reference audit failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
