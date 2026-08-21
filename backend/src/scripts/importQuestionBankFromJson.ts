import { readFile } from 'fs/promises';
import path from 'path';
import { importQuestionBank } from '../services/questionBankService';
import {
  QuestionBankImportValidationError,
  validateQuestionBankImportPayload,
} from './importQuestionBankValidator';

function readArguments(args: readonly string[]): { inputPath: string; write: boolean } {
  let inputPath = '';
  let write = false;
  for (const arg of args) {
    if (arg === '--write') { write = true; continue; }
    if (arg.startsWith('--') || inputPath) throw new Error('Usage: import:question-bank -- <json-path> [--write]');
    inputPath = arg;
  }
  if (!inputPath) throw new Error('Usage: import:question-bank -- <json-path> [--write]');
  return { inputPath, write };
}

export async function importQuestionBankFile(inputPath: string, options?: { readonly write?: boolean }): Promise<void> {
  const raw = JSON.parse(await readFile(path.resolve(process.cwd(), inputPath), 'utf8')) as unknown;
  const envelope = validateQuestionBankImportPayload(raw);
  if (!options?.write) {
    console.log(JSON.stringify({ mode: 'DRY_RUN', batchId: envelope.id, title: envelope.title, taxonomy: envelope.taxonomy, questionCount: envelope.questions.length, source: envelope.source }, null, 2));
    return;
  }
  console.log(JSON.stringify({ mode: 'IMPORT', ...await importQuestionBank(envelope) }, null, 2));
}

async function main(): Promise<void> {
  const options = readArguments(process.argv.slice(2));
  await importQuestionBankFile(options.inputPath, options);
}

if (require.main === module) {
  main().catch((error) => {
    if (error instanceof QuestionBankImportValidationError) error.issues.forEach((issue) => console.error(`- ${issue}`));
    else console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
