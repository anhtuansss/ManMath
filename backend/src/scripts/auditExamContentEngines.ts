import { disconnectPrisma, prisma } from '../lib/prisma';
import {
  ExamContentIntegrityError,
  ExamContentNotV2Error,
  getValidatedExamContentById,
} from '../services/examContentReadService';

type AuditStatus = 'confirmed_v2' | 'legacy_or_unclassified' | 'ambiguous';

type AuditEntry = {
  readonly examId: string;
  readonly status: AuditStatus;
  readonly reason: string;
};

function shouldApply(argv: readonly string[]): boolean {
  const unsupported = argv.filter((argument) => argument !== '--apply-confirmed-v2');

  if (unsupported.length > 0) {
    throw new Error(`Unsupported option: ${unsupported[0]}`);
  }

  return argv.includes('--apply-confirmed-v2');
}

async function auditExam(examId: string, externalIdCount: number): Promise<AuditEntry> {
  if (externalIdCount === 0) {
    return {
      examId,
      status: 'legacy_or_unclassified',
      reason: 'No stable external question IDs are persisted.',
    };
  }

  try {
    await getValidatedExamContentById(examId);
    return {
      examId,
      status: 'confirmed_v2',
      reason: 'All persisted V2 questions passed domain validation.',
    };
  } catch (error) {
    const reason =
      error instanceof ExamContentIntegrityError
        ? error.issues.join('; ')
        : error instanceof ExamContentNotV2Error
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown validation failure';

    return { examId, status: 'ambiguous', reason };
  }
}

async function main(): Promise<void> {
  const applyConfirmedV2 = shouldApply(process.argv.slice(2));
  const exams = await prisma.exam.findMany({
    where: { contentEngine: null },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      questions: {
        select: { externalId: true },
      },
    },
  });

  const entries: AuditEntry[] = [];

  for (const exam of exams) {
    const externalIdCount = exam.questions.filter(
      (question) => question.externalId !== null,
    ).length;
    entries.push(await auditExam(exam.id, externalIdCount));
  }

  for (const entry of entries) {
    console.log(`[${entry.status}] ${entry.examId}: ${entry.reason}`);
  }

  const confirmedV2 = entries.filter((entry) => entry.status === 'confirmed_v2');
  const ambiguous = entries.filter((entry) => entry.status === 'ambiguous');

  console.log(`\nCoverage: ${confirmedV2.length}/${entries.length} unclassified exam(s) proven V2.`);
  console.log(`Confidence: confirmed_v2 uses the runtime domain validator; ${ambiguous.length} ambiguous exam(s) remain legacy-compatible and are not rewritten.`);

  if (!applyConfirmedV2 || confirmedV2.length === 0) {
    return;
  }

  const updated = await prisma.exam.updateMany({
    where: {
      id: { in: confirmedV2.map((entry) => entry.examId) },
      contentEngine: null,
    },
    data: { contentEngine: 'v2' },
  });

  console.log(`Applied V2 engine classification to ${updated.count} proven exam(s).`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Exam content engine audit failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectPrisma();
    });
}
