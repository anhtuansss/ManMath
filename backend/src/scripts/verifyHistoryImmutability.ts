import assert from 'assert';
import { Prisma } from '@prisma/client';
import { disconnectPrisma, prisma } from '../lib/prisma';

type Transaction = Prisma.TransactionClient;

function testExamData(id: string) {
  return {
    id,
    title: 'History immutability verification',
    description: 'Ephemeral transaction-only fixture',
    durationMinutes: 30,
    subject: 'Toán',
    difficulty: 'easy' as const,
    statusLabel: 'Nháp',
    contentEngine: 'v2' as const,
  };
}

async function createPublishedVersion(tx: Transaction, suffix: string, withQuestion = false) {
  const exam = await tx.exam.create({ data: testExamData(`verify-history-${suffix}`) });
  const version = await tx.examVersion.create({
    data: {
      examId: exam.id,
      versionNumber: 1,
      status: 'draft',
      publishProfile: 'practice',
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      subject: exam.subject,
      difficulty: exam.difficulty,
      statusLabel: exam.statusLabel,
      scoringPolicy: 'vietnam_thpt_math_2025',
      contentChecksum: 'verification-only',
    },
  });

  let questionId: string | null = null;
  if (withQuestion) {
    const question = await tx.examVersionQuestion.create({
      data: {
        examVersionId: version.id,
        externalId: 'q-1',
        order: 1,
        type: 'single_choice',
        section: 1,
        content: 'Verification question',
        topicSlug: 'verification',
        topicName: 'Verification',
        choices: [
          { id: 'a', content: 'A' }, { id: 'b', content: 'B' },
          { id: 'c', content: 'C' }, { id: 'd', content: 'D' },
        ],
        answerKey: { correctChoiceId: 'a' },
      },
    });
    questionId = question.id;
  }

  const published = await tx.examVersion.update({
    where: { id: version.id },
    data: { status: 'published', publishedAt: new Date() },
  });

  return { exam, version: published, questionId };
}

async function assertRejected(name: string, action: () => Promise<unknown>): Promise<void> {
  // Prisma's PostgreSQL adapter wraps server exceptions in DriverAdapterError,
  // whose outer message is intentionally not stable. The important invariant is
  // that the database rejects the transaction, not the driver's wording.
  try {
    await action();
  } catch {
    return;
  }
  assert.fail(name);
}

async function main(): Promise<void> {
  const suffix = Date.now().toString();

  await assertRejected('Published version metadata cannot change', async () => {
    await prisma.$transaction(async (tx) => {
      const { version } = await createPublishedVersion(tx, `${suffix}-version`);
      await tx.examVersion.update({ where: { id: version.id }, data: { title: 'Mutated' } });
    });
  });

  await assertRejected('Published version questions cannot change', async () => {
    await prisma.$transaction(async (tx) => {
      const { questionId } = await createPublishedVersion(tx, `${suffix}-question`, true);
      await tx.examVersionQuestion.update({
        where: { id: questionId! },
        data: { content: 'Mutated question' },
      });
    });
  });

  await assertRejected('Attempt grading facts cannot change', async () => {
    await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({ data: testExamData(`verify-history-${suffix}-attempt`) });
      const attempt = await tx.attempt.create({
        data: {
          examId: exam.id,
          score: 0,
          scoreUnits: 0,
          maxScoreUnits: 1000,
          scoringPolicy: 'vietnam_thpt_math_2025',
          correctCount: 0,
          totalQuestions: 1,
          unansweredCount: 1,
        },
      });
      await tx.attempt.update({ where: { id: attempt.id }, data: { scoreUnits: 25 } });
    });
  });

  await assertRejected('Attempt-answer grading facts cannot change', async () => {
    await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({ data: testExamData(`verify-history-${suffix}-answer`) });
      const attempt = await tx.attempt.create({
        data: { examId: exam.id, score: 0, correctCount: 0, totalQuestions: 1, unansweredCount: 1 },
      });
      const answer = await tx.attemptAnswer.create({
        data: { attemptId: attempt.id, questionId: 1, isCorrect: false },
      });
      await tx.attemptAnswer.update({ where: { id: answer.id }, data: { isCorrect: true } });
    });
  });

  await assertRejected('Exam with attempt history cannot cascade-delete attempts', async () => {
    await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({ data: testExamData(`verify-history-${suffix}-fk`) });
      await tx.attempt.create({
        data: { examId: exam.id, score: 0, correctCount: 0, totalQuestions: 0, unansweredCount: 0 },
      });
      await tx.$executeRaw`DELETE FROM "Exam" WHERE "id" = ${exam.id}`;
    });
  });

  console.log('History immutability verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
