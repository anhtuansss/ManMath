import { prisma } from '../lib/prisma';
import type { TopicStatDto } from '../types/exam';

type AnswerTopicRecord = {
  questionId: number;
  isCorrect: boolean;
};

type TopicStatAccumulator = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
};

type RankedWeakTopic = WeakTopicRecommendationDto & {
  weaknessScore: number;
};

type SubtopicStatAccumulator = {
  subtopicSlug: string;
  subtopicName: string;
  topicSlug: string;
  topicName: string;
  totalAnswers: number;
  correctAnswers: number;
};

export type WeakTopicRecommendationDto = TopicStatDto & {
  reason: string;
};

export type SubtopicStatDto = {
  subtopicSlug: string;
  subtopicName: string;
  topicSlug: string;
  topicName: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  weak: boolean;
};

export type RecommendedExamDto = {
  examId: string;
  title: string;
  durationMinutes: number;
  matchedWeakTopicCount: number;
  matchedWeakQuestionCount: number;
  reason: string;
};

export type UserRecommendationsDto = {
  weakTopics: WeakTopicRecommendationDto[];
  recommendedExams: RecommendedExamDto[];
};

export type ProgressSummaryDto = {
  attemptCount: number;
  averageScore: number;
  bestScore: number;
  latestScore: number | null;
};

export type RecentAttemptDto = {
  attemptId: string;
  examId: string;
  examTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
};

export type ProgressByAttemptDto = {
  attemptId: string;
  examTitle: string;
  score: number;
  accuracy: number;
  submittedAt: string;
};

export type UserProgressDto = {
  summary: ProgressSummaryDto;
  recentAttempts: RecentAttemptDto[];
  progressByAttempt: ProgressByAttemptDto[];
};

export type UserAttemptHistoryItemDto = {
  attemptId: string;
  examId: string;
  examTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  unansweredCount: number;
  durationSeconds: number | null;
  submittedAt: string;
};

export type UserAttemptHistorySummaryDto = {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
};

export type UserAttemptHistoryDto = {
  attempts: UserAttemptHistoryItemDto[];
  summary: UserAttemptHistorySummaryDto;
};

export type GetUserAttemptsFilters = {
  limit?: number;
  examId?: string;
};

const MAX_WEAK_TOPICS = 3;
const MAX_RECOMMENDED_EXAMS = 3;
const MAX_RECENT_ATTEMPTS = 5;
const MAX_PROGRESS_ATTEMPTS = 10;
const MAX_RECENT_RECOMMENDATION_ATTEMPTS = 3;
const WEAK_TOPIC_ACCURACY_THRESHOLD = 85;
const WEAK_SUBTOPIC_ACCURACY_THRESHOLD = 70;
const DEFAULT_ATTEMPT_HISTORY_LIMIT = 20;

const buildWeakTopicReason = (topicStat: TopicStatDto): string => {
  if (topicStat.accuracy < 40) {
    return `Do chinh xac hien tai la ${topicStat.accuracy}% sau ${topicStat.total} cau, nen uu tien on lai chuyen de nay.`;
  }

  if (topicStat.accuracy < 70) {
    return `Chuyen de nay chua on dinh, do chinh xac hien tai la ${topicStat.accuracy}% sau ${topicStat.total} cau da lam.`;
  }

  return `Do chinh xac hien tai la ${topicStat.accuracy}%, nen tiep tuc giu nhip luyen tap de giu do on dinh.`;
};

const buildWeaknessScore = (topicStat: TopicStatDto): number => {
  const errorRate = 100 - topicStat.accuracy;
  const reliabilityWeight = Math.min(topicStat.total, 5);

  return errorRate * reliabilityWeight;
};

const rankWeakTopics = (topicStats: TopicStatDto[]): RankedWeakTopic[] => {
  return topicStats
    .filter((topicStat) => topicStat.total > 0)
    .map((topicStat) => ({
      ...topicStat,
      reason: buildWeakTopicReason(topicStat),
      weaknessScore: buildWeaknessScore(topicStat),
    }))
    .sort((a, b) => {
      if (a.weaknessScore !== b.weaknessScore) {
        return b.weaknessScore - a.weaknessScore;
      }

      if (a.accuracy !== b.accuracy) {
        return a.accuracy - b.accuracy;
      }

      if (a.total !== b.total) {
        return b.total - a.total;
      }

      return a.topicName.localeCompare(b.topicName, 'vi');
    })
    .slice(0, MAX_WEAK_TOPICS);
};

const buildRecommendationReason = (params: {
  primaryWeakTopic: RankedWeakTopic | null;
  primaryMatchedSubtopicName: string | null;
  matchedWeakQuestionCount: number;
  matchedWeakTopicCount: number;
  wasAttemptedRecently: boolean;
}): string => {
  const {
    primaryWeakTopic,
    primaryMatchedSubtopicName,
    matchedWeakQuestionCount,
    matchedWeakTopicCount,
    wasAttemptedRecently,
  } = params;

  const baseReason = primaryWeakTopic
    ? `De nay co ${matchedWeakQuestionCount} cau thuoc chuyen de ${primaryWeakTopic.topicName}, do chinh xac hien tai cua ban la ${primaryWeakTopic.accuracy}%.`
    : `De nay co ${matchedWeakQuestionCount} cau thuoc ${matchedWeakTopicCount} chuyen de ban dang yeu.`;

  const subtopicNote = primaryMatchedSubtopicName
    ? ` Trong do tap trung vao mang ${primaryMatchedSubtopicName}.`
    : '';

  if (wasAttemptedRecently) {
    return `${baseReason}${subtopicNote} Ban da lam de nay gan day, nen de moi hon se duoc uu tien neu muc do phu hop tuong duong.`;
  }

  if (matchedWeakTopicCount >= 2) {
    return `${baseReason}${subtopicNote} De nay dong thoi phu duoc ${matchedWeakTopicCount} chuyen de ban can on lai.`;
  }

  return `${baseReason}${subtopicNote}`;
};

export const getUserTopicStats = async (
  userId: string,
): Promise<TopicStatDto[]> => {
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
    },
    select: {
      answers: {
        select: {
          questionId: true,
          isCorrect: true,
        },
      },
    },
  });

  const answerRecords: AnswerTopicRecord[] = attempts.flatMap(
    (attempt) => attempt.answers,
  );

  if (answerRecords.length === 0) {
    return [];
  }

  const questionIds = Array.from(
    new Set(answerRecords.map((answer) => answer.questionId)),
  );

  const questions = await prisma.question.findMany({
    where: {
      id: {
        in: questionIds,
      },
    },
    select: {
      id: true,
      topic: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const topicByQuestionId = new Map(
    questions.map((question) => [question.id, question.topic]),
  );

  const topicStatMap = new Map<string, TopicStatAccumulator>();

  for (const answer of answerRecords) {
    const topic = topicByQuestionId.get(answer.questionId);
    const topicKey = topic?.id ?? 'uncategorized';
    const existingStat = topicStatMap.get(topicKey);

    if (existingStat) {
      existingStat.total += 1;

      if (answer.isCorrect) {
        existingStat.correct += 1;
      }

      continue;
    }

    topicStatMap.set(topicKey, {
      topicId: topic?.id ?? null,
      topicName: topic?.name ?? 'Chua phan loai',
      topicSlug: topic?.slug ?? null,
      correct: answer.isCorrect ? 1 : 0,
      total: 1,
    });
  }

  return Array.from(topicStatMap.values())
    .map((topicStat) => ({
      ...topicStat,
      accuracy:
        topicStat.total > 0
          ? Math.round((topicStat.correct / topicStat.total) * 100)
          : 0,
    }))
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return a.accuracy - b.accuracy;
      }

      if (a.total !== b.total) {
        return b.total - a.total;
      }

      return a.topicName.localeCompare(b.topicName, 'vi');
    });
};

export const getUserSubtopicStats = async (
  userId: string,
): Promise<SubtopicStatDto[]> => {
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
    },
    select: {
      answers: {
        select: {
          questionId: true,
          isCorrect: true,
        },
      },
    },
  });

  const answerRecords: AnswerTopicRecord[] = attempts.flatMap(
    (attempt) => attempt.answers,
  );

  if (answerRecords.length === 0) {
    return [];
  }

  const questionIds = Array.from(
    new Set(answerRecords.map((answer) => answer.questionId)),
  );

  const questions = await prisma.question.findMany({
    where: {
      id: {
        in: questionIds,
      },
    },
    select: {
      id: true,
      subtopic: {
        select: {
          name: true,
          slug: true,
          topic: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  const subtopicByQuestionId = new Map(
    questions.map((question) => [question.id, question.subtopic]),
  );

  const subtopicStatMap = new Map<string, SubtopicStatAccumulator>();

  for (const answer of answerRecords) {
    const subtopic = subtopicByQuestionId.get(answer.questionId);

    if (!subtopic) {
      continue;
    }

    const existingStat = subtopicStatMap.get(subtopic.slug);

    if (existingStat) {
      existingStat.totalAnswers += 1;

      if (answer.isCorrect) {
        existingStat.correctAnswers += 1;
      }

      continue;
    }

    subtopicStatMap.set(subtopic.slug, {
      subtopicSlug: subtopic.slug,
      subtopicName: subtopic.name,
      topicSlug: subtopic.topic.slug,
      topicName: subtopic.topic.name,
      totalAnswers: 1,
      correctAnswers: answer.isCorrect ? 1 : 0,
    });
  }

  return Array.from(subtopicStatMap.values())
    .map((subtopicStat) => {
      const accuracy =
        subtopicStat.totalAnswers > 0
          ? Math.round(
              (subtopicStat.correctAnswers / subtopicStat.totalAnswers) * 100,
            )
          : 0;

      return {
        ...subtopicStat,
        accuracy,
        weak: accuracy < WEAK_SUBTOPIC_ACCURACY_THRESHOLD,
      };
    })
    .sort((a, b) => {
      if (a.weak !== b.weak) {
        return a.weak ? -1 : 1;
      }

      if (a.accuracy !== b.accuracy) {
        return a.accuracy - b.accuracy;
      }

      if (a.totalAnswers !== b.totalAnswers) {
        return b.totalAnswers - a.totalAnswers;
      }

      return a.subtopicName.localeCompare(b.subtopicName, 'vi');
    });
};

export const getUserRecommendations = async (
  userId: string,
): Promise<UserRecommendationsDto> => {
  const topicStats = await getUserTopicStats(userId);
  const weakTopics = rankWeakTopics(topicStats).filter(
    (topic) => topic.accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD,
  );

  const exams = await prisma.exam.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      questions: {
        select: {
          topicId: true,
          subtopic: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (weakTopics.length === 0) {
    return {
      weakTopics: [],
      recommendedExams: exams.slice(0, MAX_RECOMMENDED_EXAMS).map((exam) => ({
        examId: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        matchedWeakTopicCount: 0,
        matchedWeakQuestionCount: 0,
        reason: 'Ban chua co du lieu luyen tap, hay bat dau voi de nay.',
      })),
    };
  }

  const recentAttempts = await prisma.attempt.findMany({
    where: {
      userId,
    },
    orderBy: {
      submittedAt: 'desc',
    },
    take: MAX_RECENT_RECOMMENDATION_ATTEMPTS,
    select: {
      examId: true,
    },
  });

  const recentlyAttemptedExamIds = new Set(
    recentAttempts.map((attempt) => attempt.examId),
  );

  const weakTopicById = new Map(
    weakTopics
      .filter((topic): topic is RankedWeakTopic & { topicId: string } => topic.topicId !== null)
      .map((topic) => [topic.topicId, topic]),
  );

  const rankedExams = exams
    .map((exam) => {
      const matchedTopicIds = new Set<string>();
      const matchedSubtopicCount = new Map<string, number>();
      let matchedWeakQuestionCount = 0;
      let primaryWeakTopic: RankedWeakTopic | null = null;

      for (const question of exam.questions) {
        if (!question.topicId) {
          continue;
        }

        const matchedWeakTopic = weakTopicById.get(question.topicId);

        if (!matchedWeakTopic) {
          continue;
        }

        matchedWeakQuestionCount += 1;
        matchedTopicIds.add(question.topicId);

        if (question.subtopic?.name) {
          matchedSubtopicCount.set(
            question.subtopic.name,
            (matchedSubtopicCount.get(question.subtopic.name) ?? 0) + 1,
          );
        }

        if (
          !primaryWeakTopic ||
          matchedWeakTopic.weaknessScore > primaryWeakTopic.weaknessScore
        ) {
          primaryWeakTopic = matchedWeakTopic;
        }
      }

      const wasAttemptedRecently = recentlyAttemptedExamIds.has(exam.id);
      const primaryMatchedSubtopicName = Array.from(matchedSubtopicCount.entries())
        .sort((a, b) => {
          if (a[1] !== b[1]) {
            return b[1] - a[1];
          }

          return a[0].localeCompare(b[0], 'vi');
        })[0]?.[0] ?? null;
      const recommendationScore =
        matchedWeakQuestionCount * 10 +
        matchedTopicIds.size * 4 -
        (wasAttemptedRecently ? 3 : 0);

      return {
        examId: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        matchedWeakTopicCount: matchedTopicIds.size,
        matchedWeakQuestionCount,
        recommendationScore,
        wasAttemptedRecently,
        primaryWeakTopic,
        primaryMatchedSubtopicName,
      };
    })
    .filter((exam) => exam.matchedWeakQuestionCount > 0)
    .sort((a, b) => {
      if (a.recommendationScore !== b.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }

      if (a.matchedWeakQuestionCount !== b.matchedWeakQuestionCount) {
        return b.matchedWeakQuestionCount - a.matchedWeakQuestionCount;
      }

      if (a.matchedWeakTopicCount !== b.matchedWeakTopicCount) {
        return b.matchedWeakTopicCount - a.matchedWeakTopicCount;
      }

      if (a.wasAttemptedRecently !== b.wasAttemptedRecently) {
        return a.wasAttemptedRecently ? 1 : -1;
      }

      if (a.durationMinutes !== b.durationMinutes) {
        return a.durationMinutes - b.durationMinutes;
      }

      return a.title.localeCompare(b.title, 'vi');
    })
    .slice(0, MAX_RECOMMENDED_EXAMS)
    .map((exam) => ({
      examId: exam.examId,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      matchedWeakTopicCount: exam.matchedWeakTopicCount,
      matchedWeakQuestionCount: exam.matchedWeakQuestionCount,
      reason: buildRecommendationReason({
        primaryWeakTopic: exam.primaryWeakTopic,
        primaryMatchedSubtopicName: exam.primaryMatchedSubtopicName,
        matchedWeakQuestionCount: exam.matchedWeakQuestionCount,
        matchedWeakTopicCount: exam.matchedWeakTopicCount,
        wasAttemptedRecently: exam.wasAttemptedRecently,
      }),
    }));

  if (rankedExams.length > 0) {
    return {
      weakTopics: weakTopics.map(({ weaknessScore, ...topic }) => topic),
      recommendedExams: rankedExams,
    };
  }

  return {
    weakTopics: weakTopics.map(({ weaknessScore, ...topic }) => topic),
    recommendedExams: exams.slice(0, MAX_RECOMMENDED_EXAMS).map((exam) => ({
      examId: exam.id,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      matchedWeakTopicCount: 0,
      matchedWeakQuestionCount: 0,
      reason:
        'Chua tim thay de khop ro chuyen de yeu, hay bat dau voi de nay de tao them du lieu luyen tap.',
    })),
  };
};

export const getUserProgress = async (
  userId: string,
): Promise<UserProgressDto> => {
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
    },
    orderBy: {
      submittedAt: 'desc',
    },
    select: {
      id: true,
      examId: true,
      score: true,
      correctCount: true,
      totalQuestions: true,
      submittedAt: true,
      exam: {
        select: {
          title: true,
        },
      },
    },
  });

  if (attempts.length === 0) {
    return {
      summary: {
        attemptCount: 0,
        averageScore: 0,
        bestScore: 0,
        latestScore: null,
      },
      recentAttempts: [],
      progressByAttempt: [],
    };
  }

  const attemptCount = attempts.length;
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = Math.round((totalScore / attemptCount) * 10) / 10;
  const bestScore = attempts.reduce(
    (maxScore, attempt) => Math.max(maxScore, attempt.score),
    0,
  );
  const latestScore = attempts[0]?.score ?? null;

  const recentAttempts: RecentAttemptDto[] = attempts
    .slice(0, MAX_RECENT_ATTEMPTS)
    .map((attempt) => ({
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.exam.title,
      score: attempt.score,
      correctCount: attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      submittedAt: attempt.submittedAt.toISOString(),
    }));

  const progressByAttempt: ProgressByAttemptDto[] = attempts
    .slice(0, MAX_PROGRESS_ATTEMPTS)
    .map((attempt) => ({
      attemptId: attempt.id,
      examTitle: attempt.exam.title,
      score: attempt.score,
      accuracy:
        attempt.totalQuestions > 0
          ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
          : 0,
      submittedAt: attempt.submittedAt.toISOString(),
    }))
    .reverse();

  return {
    summary: {
      attemptCount,
      averageScore,
      bestScore,
      latestScore,
    },
    recentAttempts,
    progressByAttempt,
  };
};

export const getUserAttemptHistory = async (
  userId: string,
  filters?: GetUserAttemptsFilters,
): Promise<UserAttemptHistoryDto> => {
  const take = filters?.limit ?? DEFAULT_ATTEMPT_HISTORY_LIMIT;
  const where = {
    userId,
    ...(filters?.examId ? { examId: filters.examId } : {}),
  };

  const [summaryAggregate, attempts] = await prisma.$transaction([
    prisma.attempt.aggregate({
      where,
      _avg: {
        score: true,
      },
      _max: {
        score: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.attempt.findMany({
      where,
      orderBy: {
        submittedAt: 'desc',
      },
      take,
      select: {
        id: true,
        examId: true,
        score: true,
        correctCount: true,
        totalQuestions: true,
        unansweredCount: true,
        durationSeconds: true,
        submittedAt: true,
        exam: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  const totalAttempts = summaryAggregate._count._all;

  return {
    attempts: attempts.map((attempt) => ({
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.exam.title,
      score: attempt.score,
      correctCount: attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      unansweredCount: attempt.unansweredCount,
      durationSeconds: attempt.durationSeconds,
      submittedAt: attempt.submittedAt.toISOString(),
    })),
    summary: {
      totalAttempts,
      averageScore:
        totalAttempts > 0 && typeof summaryAggregate._avg.score === 'number'
          ? Math.round(summaryAggregate._avg.score * 10) / 10
          : 0,
      bestScore:
        totalAttempts > 0 && typeof summaryAggregate._max.score === 'number'
          ? summaryAggregate._max.score
          : 0,
    },
  };
};
