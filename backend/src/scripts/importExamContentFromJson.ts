import { readFile } from 'fs/promises';
import path from 'path';
import {
  ExamContentImportValidationError,
  validateExamContentImportPayload,
} from './importExamContentValidator';
import { importExamContent } from '../services/examContentImportService';

type ImportCliOptions = {
  readonly inputPath: string;
  readonly write: boolean;
};

function parseCliArguments(args: string[]): ImportCliOptions {
  let inputPath = '';
  let write = false;

  for (const arg of args) {
    if (arg === '--write') {
      write = true;
      continue;
    }

    if (inputPath.length > 0) {
      throw new Error('Only one JSON file path is allowed');
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unsupported option: ${arg}`);
    }

    inputPath = arg;
  }

  if (inputPath.trim().length === 0) {
    throw new Error(
      'Missing JSON file path. Example: npm run import:exam-content -- ./src/data/import/sample-exam-content-v2.json',
    );
  }

  return { inputPath, write };
}

const readJsonFile = async (inputPath: string): Promise<unknown> => {
  const rawContent = await readFile(inputPath, 'utf8');

  try {
    return JSON.parse(rawContent) as unknown;
  } catch {
    throw new Error(`File JSON is invalid: ${inputPath}`);
  }
};

const printSummary = (
  envelope: ReturnType<typeof validateExamContentImportPayload>,
  mode: 'DRY RUN' | 'IMPORT',
): void => {
  const questionCountByType = {
    singleChoice: 0,
    trueFalseGroup: 0,
    shortAnswer: 0,
  };

  for (const question of envelope.questions) {
    switch (question.type) {
      case 'single_choice':
        questionCountByType.singleChoice += 1;
        break;
      case 'true_false_group':
        questionCountByType.trueFalseGroup += 1;
        break;
      case 'short_answer':
        questionCountByType.shortAnswer += 1;
        break;
    }
  }

  console.log(`[${mode}] Exam ID: ${envelope.exam.id}`);
  console.log(`[${mode}] Title: ${envelope.exam.title}`);
  console.log(`[${mode}] Topics: ${envelope.taxonomy.topics.length}`);
  console.log(`[${mode}] Subtopics: ${envelope.taxonomy.subtopics.length}`);
  console.log(`[${mode}] Questions: ${envelope.questions.length}`);
  console.log(`[${mode}] Single choice: ${questionCountByType.singleChoice}`);
  console.log(`[${mode}] True/false groups: ${questionCountByType.trueFalseGroup}`);
  console.log(`[${mode}] Short answers: ${questionCountByType.shortAnswer}`);
}

export async function importExamContentFile(
  inputPath: string,
  options?: { readonly write?: boolean },
): Promise<void> {
  const resolvedPath = path.resolve(process.cwd(), inputPath);
  const rawValue = await readJsonFile(resolvedPath);
  const envelope = validateExamContentImportPayload(rawValue);

  if (!options?.write) {
    printSummary(envelope, 'DRY RUN');
    console.log('[DRY RUN] Validation passed. No database changes were made.');
    return;
  }

  await importExamContent(envelope);

  printSummary(envelope, 'IMPORT');
  console.log(`[IMPORT] Imported exam ${envelope.exam.id}.`);
}

async function main(): Promise<void> {
  const options = parseCliArguments(process.argv.slice(2));

  await importExamContentFile(options.inputPath, {
    write: options.write,
  });
}

if (require.main === module) {
  main().catch((error) => {
    if (error instanceof ExamContentImportValidationError) {
      console.error('Exam content import validation failed:');

      for (const issue of error.issues) {
        console.error(`- ${issue}`);
      }
    } else {
      console.error(
        'Exam content import failed:',
        error instanceof Error ? error.message : error,
      );
    }

    process.exitCode = 1;
  });
}
