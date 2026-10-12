import { disconnectPrisma } from '../lib/prisma';
import { ExamVersionPublishError, publishDraftExamVersion } from '../services/examVersionPublishService';

async function main(): Promise<void> {
  const examId = process.argv[2]?.trim();
  if (!examId) throw new Error('Usage: npm run publish:exam-content -- <exam-id>');
  const result = await publishDraftExamVersion(examId);
  console.log(`Published ${examId} version ${result.versionNumber} (${result.versionId}).`);
}

main()
  .catch((error) => {
    if (error instanceof ExamVersionPublishError && error.issues.length > 0) {
      console.error('Publish readiness failed:');
      error.issues.forEach((issue) => console.error(`- ${issue}`));
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
