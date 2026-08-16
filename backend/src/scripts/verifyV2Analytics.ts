import assert from 'assert';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { getUserSubtopicAnalytics, getUserTopicAnalytics } from '../services/analyticsService';
import { createExamContentAttempt } from '../services/examContentAttemptService';

async function main(): Promise<void> {
  const suffix = Date.now().toString();
  const user = await prisma.user.create({
    data: {
      email: `verify-v2-analytics-${suffix}@example.test`,
      authProvider: 'password',
      passwordHash: 'not-used-by-verification',
    },
  });

  const attempt = await createExamContentAttempt('verify-v2-minimal-exam', {
    examVersionId: (await prisma.examVersion.findFirst({
      where: { examId: 'verify-v2-minimal-exam', status: 'published' },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    }))?.id,
    responses: [
      { questionId: 'sc-1', type: 'single_choice', choiceId: 'b' },
      {
        questionId: 'tf-1',
        type: 'true_false_group',
        values: { a: true, b: false, c: true, d: true },
      },
      { questionId: 'sa-1', type: 'short_answer', value: '0' },
    ],
  }, user.id);

  assert.notEqual(attempt, null);
  assert.equal(attempt?.scoreUnits, 50);

  const topicAnalytics = await getUserTopicAnalytics(user.id);
  assert.deepEqual(topicAnalytics.coverage, {
    scoreUnitAttemptCount: 1,
    unavailableV2AttemptCount: 0,
  });
  assert.equal(topicAnalytics.topicStats.length, 1);
  assert.equal(topicAnalytics.topicStats[0]?.awardedScoreUnits, 50);
  assert.equal(topicAnalytics.topicStats[0]?.maxScoreUnits, 175);
  assert.equal(topicAnalytics.topicStats[0]?.masteryPercentage, 29);
  assert.equal(topicAnalytics.topicStats[0]?.accuracy, 0);

  const subtopicAnalytics = await getUserSubtopicAnalytics(user.id);
  assert.equal(subtopicAnalytics.subtopicStats.length, 1);
  assert.equal(subtopicAnalytics.subtopicStats[0]?.masteryPercentage, 0);

  console.log('V2 score-unit analytics verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
