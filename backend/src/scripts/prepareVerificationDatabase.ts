import path from 'path';
import { assertVerificationDatabase } from '../config/verificationDatabase';
import { importExamContentFile } from './importExamContentFromJson';
import { publishDraftExamVersion } from '../services/examVersionPublishService';
import { disconnectPrisma } from '../lib/prisma';

const fixtureExamId = 'verify-v2-minimal-exam';

async function main(): Promise<void> {
  assertVerificationDatabase();

  // Use the same validated import and publish pipeline as the application.
  const fixturePath = path.resolve(
    process.cwd(),
    'src/test-fixtures/v2-minimal-exam.json',
  );
  await importExamContentFile(fixturePath, { write: true });
  await publishDraftExamVersion(fixtureExamId);
  console.log(`Verification fixture ${fixtureExamId} is published.`);
}

main()
  .catch((error) => {
    console.error('Verification database preparation failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
