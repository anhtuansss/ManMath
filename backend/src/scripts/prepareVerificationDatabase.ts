import path from 'path';
import { assertVerificationDatabase } from '../config/verificationDatabase';
import { importExamContentFile } from './importExamContentFromJson';
import { publishDraftExamVersion } from '../services/examVersionPublishService';
import { disconnectPrisma } from '../lib/prisma';

const fixtureExamId = 'thpt-math-v2-sample';

async function main(): Promise<void> {
  assertVerificationDatabase();

  // Use the same validated import and publish pipeline as the application.
  const fixturePath = path.resolve(
    process.cwd(),
    'src/data/import/sample-exam-content-v2.json',
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
