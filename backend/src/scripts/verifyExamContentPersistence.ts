import assert from 'assert';
import { disconnectPrisma, prisma } from '../lib/prisma';

const examId = 'thpt-math-v2-sample';

async function main(): Promise<void> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        select: {
          id: true,
          externalId: true,
          type: true,
          order: true,
          topic: {
            select: {
              slug: true,
            },
          },
          subtopic: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (exam === null) {
    throw new Error(`Imported exam ${examId} must exist`);
  }
  assert.equal(exam.questions.length, 3);

  const questionsByExternalId = new Map(
    exam.questions.map((question) => [question.externalId, question]),
  );

  assert.equal(questionsByExternalId.size, 3);
  assert.equal(questionsByExternalId.get('sc-1')?.type, 'single_choice');
  assert.equal(
    questionsByExternalId.get('tf-1')?.type,
    'true_false_group',
  );
  assert.equal(questionsByExternalId.get('sa-1')?.type, 'short_answer');

  for (const question of exam.questions) {
    assert.equal(question.topic?.slug, 'ham-so');
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