import { disconnectPrisma } from '../lib/prisma';
import { QuestionBankPublishError, publishQuestionBankBatch } from '../services/questionBankService';

async function main(): Promise<void> {
  const externalId = process.argv[2]?.trim();
  if (!externalId) throw new Error('Usage: publish:question-bank -- <batch-id>');
  console.log(JSON.stringify(await publishQuestionBankBatch(externalId), null, 2));
}

main().catch((error) => {
  if (error instanceof QuestionBankPublishError) error.issues.forEach((issue) => console.error(`- ${issue}`));
  else console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(disconnectPrisma);
