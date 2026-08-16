import assert from 'assert';
import { disconnectPrisma, prisma } from '../lib/prisma';

const examId = 'verify-v2-minimal-exam';

async function main(): Promise<void> {
  const version = await prisma.examVersion.findFirst({
    where: { examId, status: 'published' },
    orderBy: { versionNumber: 'desc' },
    select: {
      questions: {
        select: {
          externalId: true,
          type: true,
          order: true,
          topicSlug: true,
          subtopicSlug: true,
        },
      },
    },
  });

  if (version === null) {
    throw new Error(`Published exam version for ${examId} must exist`);
  }
  assert.equal(version.questions.length, 3);

  const questionsByExternalId = new Map(
    version.questions.map((question) => [question.externalId, question]),
  );

  assert.equal(questionsByExternalId.size, 3);
  assert.equal(questionsByExternalId.get('sc-1')?.type, 'single_choice');
  assert.equal(
    questionsByExternalId.get('tf-1')?.type,
    'true_false_group',
  );
  assert.equal(questionsByExternalId.get('sa-1')?.type, 'short_answer');

  for (const question of version.questions) {
    assert.equal(question.topicSlug, 'ham-so');
  }

  console.log('Exam content persistence verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
