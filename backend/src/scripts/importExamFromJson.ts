import { readFile } from 'fs/promises';
import path from 'path';
import { Prisma } from '@prisma/client';
import { disconnectPrisma, prisma } from '../lib/prisma';
import {
  ImportValidationError,
  type ImportSummary,
  type NormalizedExamInput,
  type NormalizedSubtopicInput,
  type NormalizedTopicInput,
  printImportSummary,
  validateExamImportPayload,
} from './importExamValidator';

type ImportCliOptions = {
  inputPath: string;
  dryRun: boolean;
  batch: boolean;
};

type ManifestInput = {
  exams: string[];
};

type LoadedExamFile = {
  displayPath: string;
  resolvedPath: string;
  exam: NormalizedExamInput;
  summary: ImportSummary;
};

type BatchFileIssue = {
  filePath: string;
  issues: string[];
};

type BatchSummary = {
  totalFiles: number;
  validFiles: number;
  errorFiles: number;
  examCount: number;
  totalQuestions: number;
};

class BatchImportValidationError extends Error {
  fileIssues: BatchFileIssue[];

  constructor(fileIssues: BatchFileIssue[]) {
    super('Batch import validation failed');
    this.name = 'BatchImportValidationError';
    this.fileIssues = fileIssues;
  }
}

const parseCliArguments = (args: string[]): ImportCliOptions => {
  let inputPath = '';
  let dryRun = false;
  let batch = false;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--batch') {
      batch = true;
      continue;
    }

    if (!inputPath) {
      inputPath = arg;
    }
  }

  if (inputPath.trim().length === 0) {
    throw new Error(
      'Thieu duong dan file JSON. Vi du: npm run import:exam -- ./src/data/import/sample-exam.json',
    );
  }

  return {
    inputPath,
    dryRun,
    batch,
  };
};

const readJsonFile = async (resolvedPath: string): Promise<unknown> => {
  const rawContent = await readFile(resolvedPath, 'utf8');

  try {
    return JSON.parse(rawContent) as unknown;
  } catch {
    throw new Error(`File JSON khong hop le: ${resolvedPath}`);
  }
};

const validateManifestInput = (rawValue: unknown): ManifestInput => {
  if (
    typeof rawValue !== 'object' ||
    rawValue === null ||
    Array.isArray(rawValue)
  ) {
    throw new Error('Manifest phai la object JSON hop le');
  }

  const manifest = rawValue as Record<string, unknown>;

  if (!Array.isArray(manifest.exams) || manifest.exams.length === 0) {
    throw new Error('Manifest.exams phai la mang khong rong');
  }

  const exams = manifest.exams.map((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new Error(`Manifest.exams[${index}] phai la duong dan string hop le`);
    }

    return entry.trim();
  });

  return { exams };
};

const loadExamInputFromResolvedPath = async (
  resolvedPath: string,
  displayPath: string,
): Promise<LoadedExamFile> => {
  const parsedJson = await readJsonFile(resolvedPath);
  const { exam, summary } = validateExamImportPayload(parsedJson);

  return {
    displayPath,
    resolvedPath,
    exam,
    summary,
  };
};

const loadExamInputFromCliPath = async (
  inputPath: string,
): Promise<LoadedExamFile> => {
  const resolvedPath = path.resolve(process.cwd(), inputPath);

  return loadExamInputFromResolvedPath(resolvedPath, inputPath);
};

const buildBatchSummary = (loadedFiles: LoadedExamFile[], fileIssues: BatchFileIssue[]): BatchSummary => {
  return {
    totalFiles: loadedFiles.length + fileIssues.length,
    validFiles: loadedFiles.length,
    errorFiles: fileIssues.length,
    examCount: loadedFiles.length,
    totalQuestions: loadedFiles.reduce(
      (sum, loadedFile) => sum + loadedFile.summary.questionCount,
      0,
    ),
  };
};

const printBatchSummary = (
  summary: BatchSummary,
  options?: { dryRun?: boolean },
): void => {
  const modeLabel = options?.dryRun ? 'DRY RUN' : 'IMPORT';

  console.log(`[${modeLabel}] Batch files: ${summary.totalFiles}`);
  console.log(`[${modeLabel}] Valid files: ${summary.validFiles}`);
  console.log(`[${modeLabel}] Error files: ${summary.errorFiles}`);
  console.log(`[${modeLabel}] Exams: ${summary.examCount}`);
  console.log(`[${modeLabel}] Total questions: ${summary.totalQuestions}`);
};

const printBatchIssues = (fileIssues: BatchFileIssue[]): void => {
  for (const fileIssue of fileIssues) {
    console.error(`- ${fileIssue.filePath}`);

    for (const issue of fileIssue.issues) {
      console.error(`  - ${issue}`);
    }
  }
};

const loadBatchExamFiles = async (
  manifestPath: string,
): Promise<{
  loadedFiles: LoadedExamFile[];
  fileIssues: BatchFileIssue[];
}> => {
  const resolvedManifestPath = path.resolve(process.cwd(), manifestPath);
  const manifestDirectory = path.dirname(resolvedManifestPath);
  const parsedManifest = await readJsonFile(resolvedManifestPath);
  const manifest = validateManifestInput(parsedManifest);

  const loadedFiles: LoadedExamFile[] = [];
  const fileIssues: BatchFileIssue[] = [];

  for (const examPath of manifest.exams) {
    const resolvedExamPath = path.resolve(manifestDirectory, examPath);
    const displayPath = path.relative(process.cwd(), resolvedExamPath);

    try {
      const loadedFile = await loadExamInputFromResolvedPath(
        resolvedExamPath,
        displayPath,
      );
      loadedFiles.push(loadedFile);
    } catch (error) {
      if (error instanceof ImportValidationError) {
        fileIssues.push({
          filePath: displayPath,
          issues: error.issues,
        });
        continue;
      }

      fileIssues.push({
        filePath: displayPath,
        issues: [error instanceof Error ? error.message : 'Loi khong xac dinh'],
      });
    }
  }

  return {
    loadedFiles,
    fileIssues,
  };
};

const upsertTopic = async (
  tx: Prisma.TransactionClient,
  topic: NormalizedTopicInput | null,
): Promise<string | null> => {
  if (!topic) {
    return null;
  }

  const upsertedTopic = await tx.topic.upsert({
    where: {
      slug: topic.slug,
    },
    update: {
      name: topic.name,
    },
    create: {
      name: topic.name,
      slug: topic.slug,
    },
  });

  return upsertedTopic.id;
};

const upsertSubtopic = async (
  tx: Prisma.TransactionClient,
  params: {
    topicId: string | null;
    subtopic: NormalizedSubtopicInput | null;
  },
): Promise<string | null> => {
  const { topicId, subtopic } = params;

  if (!subtopic) {
    return null;
  }

  if (!topicId) {
    throw new Error(
      `Subtopic ${subtopic.slug} yeu cau topic hop le truoc khi import`,
    );
  }

  const upsertedSubtopic = await tx.subtopic.upsert({
    where: {
      slug: subtopic.slug,
    },
    update: {
      name: subtopic.name,
      topicId,
    },
    create: {
      name: subtopic.name,
      slug: subtopic.slug,
      topicId,
    },
  });

  return upsertedSubtopic.id;
};

export const importNormalizedExam = async (
  exam: NormalizedExamInput,
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    const existingExam = await tx.exam.findUnique({
      where: { id: exam.id },
      select: { contentEngine: true },
    });

    if (existingExam?.contentEngine === 'v2') {
      throw new Error(
        `Exam ${exam.id} is managed by the V2 content importer and cannot be overwritten by the legacy importer`,
      );
    }

    const incomingQuestionIds = exam.questions.map((question) => question.id);
    const existingQuestions = await tx.question.findMany({
      where: {
        id: {
          in: incomingQuestionIds,
        },
      },
      select: {
        id: true,
        examId: true,
      },
    });

    for (const existingQuestion of existingQuestions) {
      if (existingQuestion.examId !== exam.id) {
        throw new Error(
          `question id ${existingQuestion.id} dang thuoc exam ${existingQuestion.examId}, khong the import sang exam ${exam.id}`,
        );
      }
    }

    await tx.exam.upsert({
      where: {
        id: exam.id,
      },
      update: {
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        subject: exam.subject,
        difficulty: exam.difficulty,
        source: exam.source,
        year: exam.year,
        statusLabel: exam.statusLabel,
        contentEngine: 'legacy',
      },
      create: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        subject: exam.subject,
        difficulty: exam.difficulty,
        source: exam.source,
        year: exam.year,
        statusLabel: exam.statusLabel,
        contentEngine: 'legacy',
      },
    });

    for (const [index, question] of exam.questions.entries()) {
      const topicId = await upsertTopic(tx, question.topic);
      const subtopicId = await upsertSubtopic(tx, {
        topicId,
        subtopic: question.subtopic,
      });

      await tx.question.upsert({
        where: {
          id: question.id,
        },
        update: {
          examId: exam.id,
          order: index + 1,
          topicId,
          subtopicId,
          question: question.question,
          imageUrl: question.imageUrl,
          explanation: question.explanation,
          options: question.options,
          optionImageUrls: question.optionImageUrls,
          correctAnswer: question.correctAnswer,
        },
        create: {
          id: question.id,
          examId: exam.id,
          order: index + 1,
          topicId,
          subtopicId,
          question: question.question,
          imageUrl: question.imageUrl,
          explanation: question.explanation,
          options: question.options,
          optionImageUrls: question.optionImageUrls,
          correctAnswer: question.correctAnswer,
        },
      });
    }
  });
};

export const importExamFromFile = async (
  inputPath: string,
  options?: { dryRun?: boolean },
): Promise<void> => {
  if (inputPath.trim().length === 0) {
    throw new Error(
      'Thieu duong dan file JSON. Vi du: npm run import:exam -- ./src/data/import/sample-exam.json',
    );
  }

  const loadedFile = await loadExamInputFromCliPath(inputPath);

  if (options?.dryRun) {
    printImportSummary(loadedFile.summary, { dryRun: true });
    console.log('[DRY RUN] Validation passed. No database changes were made.');
    return;
  }

  await importNormalizedExam(loadedFile.exam);

  printImportSummary(loadedFile.summary);
  console.log(
    `[IMPORT] Imported exam ${loadedFile.summary.examId} from ${loadedFile.resolvedPath} without duplicates.`,
  );
};

export const importExamBatchFromManifest = async (
  manifestPath: string,
  options?: { dryRun?: boolean },
): Promise<void> => {
  const { loadedFiles, fileIssues } = await loadBatchExamFiles(manifestPath);
  const batchSummary = buildBatchSummary(loadedFiles, fileIssues);

  printBatchSummary(batchSummary, { dryRun: options?.dryRun });

  if (fileIssues.length > 0) {
    throw new BatchImportValidationError(fileIssues);
  }

  if (options?.dryRun) {
    console.log('[DRY RUN] Batch validation passed. No database changes were made.');
    return;
  }

  for (const loadedFile of loadedFiles) {
    await importNormalizedExam(loadedFile.exam);
    printImportSummary(loadedFile.summary);
    console.log(
      `[IMPORT] Imported exam ${loadedFile.summary.examId} from ${loadedFile.displayPath} without duplicates.`,
    );
  }
}

async function main(): Promise<void> {
  const cliOptions = parseCliArguments(process.argv.slice(2));

  if (cliOptions.batch) {
    await importExamBatchFromManifest(cliOptions.inputPath, {
      dryRun: cliOptions.dryRun,
    });
    return;
  }

  await importExamFromFile(cliOptions.inputPath, { dryRun: cliOptions.dryRun });
}

if (require.main === module) {
  main()
    .catch((error) => {
      if (error instanceof BatchImportValidationError) {
        console.error('Batch import validation failed:');
        printBatchIssues(error.fileIssues);
      } else if (error instanceof ImportValidationError) {
        console.error('Import validation failed:');

        for (const issue of error.issues) {
          console.error(`- ${issue}`);
        }
      } else {
        console.error(
          'Import failed:',
          error instanceof Error ? error.message : error,
        );
      }

      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectPrisma();
    });
}
