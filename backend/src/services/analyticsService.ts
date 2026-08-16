import { prisma } from '../lib/prisma';
import type { TopicStatDto } from '../types/exam';
import {
  getUserAnalyticsFacts,
  type AnalyticsCoverageDto,
} from './analyticsFactsService';

type TopicStatAccumulator = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
  awardedScoreUnits: number;
  maxScoreUnits: number;
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
  awardedScoreUnits: number;
  maxScoreUnits: number;
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
  awardedScoreUnits: number;
  maxScoreUnits: number;
  masteryPercentage: number | null;
};

export type RecommendedExamDto = {
  examId: string;
  title: string;
  durationMinutes: number;
  matchedWeakTopicCount: number;
  matchedWeakQuestionCount: number;
  reason: string;
};

export type TopicAnalyticsDto = {
  topicStats: TopicStatDto[];
  coverage: AnalyticsCoverageDto;
};

export type SubtopicAnalyticsDto = {
  subtopicStats: SubtopicStatDto[];
  coverage: AnalyticsCoverageDto;
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
  items: UserAttemptHistoryItemDto[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  summary: UserAttemptHistorySummaryDto;
};

export type GetUserAttemptsFilters = {
  page?: number;
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
const DEFAULT_ATTEMPT_HISTORY_LIMIT = 10;

const performancePercentage = (topicStat: TopicStatDto): number =>
  topicStat.masteryPercentage ?? topicStat.accuracy;

const buildWeakTopicReason = (topicStat: TopicStatDto): string => {
  const performance = performancePercentage(topicStat);
  const metricLabel = topicStat.masteryPercentage === null ? 'Do chinh xac' : 'Muc do thanh thao theo diem';
  if (performance < 40) {
    return `${metricLabel} hien tai la ${performance}% sau ${topicStat.total} cau, nen uu tien on lai chuyen de nay.`;
  }

  if (performance < 70) {
    return `Chuyen de nay chua on dinh, ${metricLabel.toLowerCase()} hien tai la ${performance}% sau ${topicStat.total} cau da lam.`;
  }

  return `${metricLabel} hien tai la ${performance}%, nen tiep tuc giu nhip luyen tap de giu do on dinh.`;
};

const buildWeaknessScore = (topicStat: TopicStatDto): number => {
  const errorRate = 100 - performancePercentage(topicStat);
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

      if (performancePercentage(a) !== performancePercentage(b)) {
        return performancePercentage(a) - performancePercentage(b);
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
    ? `De nay co ${matchedWeakQuestionCount} cau thuoc chuyen de ${primaryWeakTopic.topicName}, muc do thanh thao hien tai cua ban la ${performancePercentage(primaryWeakTopic)}%.`
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

const percentage = (numerator: number, denominator: number): number =>
  denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

const masteryPercentage = (awardedScoreUnits: number, maxScoreUnits: number): number | null =>
  maxScoreUnits > 0 ? percentage(awardedScoreUnits, maxScoreUnits) : null;

export const getUserTopicAnalytics = async (userId: string): Promise<TopicAnalyticsDto> => {
  const { facts, coverage } = await getUserAnalyticsFacts(userId);
  const topicSlugs = Array.from(new Set(
    facts.flatMap((fact) => fact.topicSlug === null ? [] : [fact.topicSlug]),
  ));
  const topics = topicSlugs.length === 0 ? [] : await prisma.topic.findMany({
    where: { slug: { in: topicSlugs } },
    select: { id: true, name: true, slug: true },
  });
  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const accumulators = new Map<string, TopicStatAccumulator>();

  for (const fact of facts) {
    const topic = fact.topicSlug === null ? undefined : topicBySlug.get(fact.topicSlug);
    const key = fact.topicSlug ?? 'uncategorized';
    const stat = accumulators.get(key) ?? {
      topicId: topic?.id ?? null,
      topicName: topic?.name ?? 'Chua phan loai',
      topicSlug: fact.topicSlug,
      correct: 0,
      total: 0,
      awardedScoreUnits: 0,
      maxScoreUnits: 0,
    };
    stat.total += 1;
    if (fact.isFullyCorrect) stat.correct += 1;
    stat.awardedScoreUnits += fact.awardedScoreUnits;
    stat.maxScoreUnits += fact.maxScoreUnits;
    accumulators.set(key, stat);
  }

  const topicStats = Array.from(accumulators.values())
    .map((stat): TopicStatDto => ({
      topicId: stat.topicId,
      topicName: stat.topicName,
      topicSlug: stat.topicSlug,
      correct: stat.correct,
      total: stat.total,
      accuracy: percentage(stat.correct, stat.total),
      awardedScoreUnits: stat.awardedScoreUnits,
      maxScoreUnits: stat.maxScoreUnits,
      masteryPercentage: masteryPercentage(stat.awardedScoreUnits, stat.maxScoreUnits),
    }))
    .sort((a, b) => {
      const aMetric = a.masteryPercentage ?? a.accuracy;
      const bMetric = b.masteryPercentage ?? b.accuracy;
      return aMetric - bMetric || b.total - a.total || a.topicName.localeCompare(b.topicName, 'vi');
    });

  return { topicStats, coverage };
};

export const getUserTopicStats = async (userId: string): Promise<TopicStatDto[]> =>
  (await getUserTopicAnalytics(userId)).topicStats;

export const getUserSubtopicAnalytics = async (userId: string): Promise<SubtopicAnalyticsDto> => {
  const { facts, coverage } = await getUserAnalyticsFacts(userId);
  const subtopicSlugs = Array.from(new Set(
    facts.flatMap((fact) => fact.subtopicSlug === null ? [] : [fact.subtopicSlug]),
  ));
  const subtopics = subtopicSlugs.length === 0 ? [] : await prisma.subtopic.findMany({
    where: { slug: { in: subtopicSlugs } },
    select: { name: true, slug: true, topic: { select: { name: true, slug: true } } },
  });
  const subtopicBySlug = new Map(subtopics.map((subtopic) => [subtopic.slug, subtopic]));
  const accumulators = new Map<string, SubtopicStatAccumulator>();

  for (const fact of facts) {
    if (fact.subtopicSlug === null) continue;
    const subtopic = subtopicBySlug.get(fact.subtopicSlug);
    if (subtopic === undefined) continue;
    const stat = accumulators.get(fact.subtopicSlug) ?? {
      subtopicSlug: subtopic.slug,
      subtopicName: subtopic.name,
      topicSlug: subtopic.topic.slug,
      topicName: subtopic.topic.name,
      totalAnswers: 0,
      correctAnswers: 0,
      awardedScoreUnits: 0,
      maxScoreUnits: 0,
    };
    stat.totalAnswers += 1;
    if (fact.isFullyCorrect) stat.correctAnswers += 1;
    stat.awardedScoreUnits += fact.awardedScoreUnits;
    stat.maxScoreUnits += fact.maxScoreUnits;
    accumulators.set(fact.subtopicSlug, stat);
  }

  const subtopicStats = Array.from(accumulators.values())
    .map((stat): SubtopicStatDto => {
      const mastery = masteryPercentage(stat.awardedScoreUnits, stat.maxScoreUnits);
      const accuracy = percentage(stat.correctAnswers, stat.totalAnswers);
      return {
        subtopicSlug: stat.subtopicSlug,
        subtopicName: stat.subtopicName,
        topicSlug: stat.topicSlug,
        topicName: stat.topicName,
        totalAnswers: stat.totalAnswers,
        correctAnswers: stat.correctAnswers,
        accuracy,
        weak: (mastery ?? accuracy) < WEAK_SUBTOPIC_ACCURACY_THRESHOLD,
        awardedScoreUnits: stat.awardedScoreUnits,
        maxScoreUnits: stat.maxScoreUnits,
        masteryPercentage: mastery,
      };
    })
    .sort((a, b) => {
      const aMetric = a.masteryPercentage ?? a.accuracy;
      const bMetric = b.masteryPercentage ?? b.accuracy;
      return Number(b.weak) - Number(a.weak) || aMetric - bMetric || b.totalAnswers - a.totalAnswers || a.subtopicName.localeCompare(b.subtopicName, 'vi');
    });

  return { subtopicStats, coverage };
};

export const getUserSubtopicStats = async (userId: string): Promise<SubtopicStatDto[]> =>
  (await getUserSubtopicAnalytics(userId)).subtopicStats;

export const getUserRecommendations = async (
  userId: string,
): Promise<UserRecommendationsDto> => {
  const topicStats = await getUserTopicStats(userId);
  const weakTopics = rankWeakTopics(topicStats).filter(
    (topic) => performancePercentage(topic) < WEAK_TOPIC_ACCURACY_THRESHOLD,
  );

  const exams = await prisma.exam.findMany({
    where: { versions: { some: { status: 'published' } } },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      versions: {
        where: { status: 'published' },
        orderBy: { versionNumber: 'desc' },
        take: 1,
        select: {
          title: true,
          durationMinutes: true,
          questions: {
            select: {
              topicSlug: true,
              subtopicName: true,
            },
          },
        },
      },
    },
  });

  const discoverableExams = exams.filter((exam) => exam.versions.length === 1);

  if (weakTopics.length === 0) {
    return {
      weakTopics: [],
      recommendedExams: discoverableExams.slice(0, MAX_RECOMMENDED_EXAMS).map((exam) => ({
        examId: exam.id,
        title: exam.versions[0]!.title,
        durationMinutes: exam.versions[0]!.durationMinutes,
        matchedWeakTopicCount: 0,
        matchedWeakQuestionCount: 0,
        reason: 'Ban chua co du lieu luyen tap, hay bat dau voi de nay.',
      })),
    };
  }

  const recentAttempts = await prisma.attempt.findMany({
    where: {
      userId,
      scoringPolicy: 'vietnam_thpt_math_2025',
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
  const weakTopicBySlug = new Map(
    weakTopics
      .filter((topic): topic is RankedWeakTopic & { topicSlug: string } => topic.topicSlug !== null)
      .map((topic) => [topic.topicSlug, topic]),
  );

  const rankedExams = discoverableExams
    .map((exam) => {
      const matchedTopicIds = new Set<string>();
      const matchedSubtopicCount = new Map<string, number>();
      let matchedWeakQuestionCount = 0;
      let primaryWeakTopic: RankedWeakTopic | null = null;

      const sourceQuestions = exam.versions[0]!.questions.map((question) => ({
          topicId: weakTopicBySlug.get(question.topicSlug)?.topicId ?? null,
          subtopicName: question.subtopicName,
        }));

      for (const question of sourceQuestions) {
        if (!question.topicId) {
          continue;
        }

        const matchedWeakTopic = weakTopicById.get(question.topicId);

        if (!matchedWeakTopic) {
          continue;
        }

        matchedWeakQuestionCount += 1;
        matchedTopicIds.add(question.topicId);

        if (question.subtopicName) {
          matchedSubtopicCount.set(
            question.subtopicName,
            (matchedSubtopicCount.get(question.subtopicName) ?? 0) + 1,
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
        title: exam.versions[0]!.title,
        durationMinutes: exam.versions[0]!.durationMinutes,
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
    recommendedExams: discoverableExams.slice(0, MAX_RECOMMENDED_EXAMS).map((exam) => ({
      examId: exam.id,
      title: exam.versions[0]!.title,
      durationMinutes: exam.versions[0]!.durationMinutes,
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
    scoringPolicy: 'vietnam_thpt_math_2025' as const,
    ...(filters?.examId ? { examId: filters.examId } : {}),
  };

  const summaryAggregate = await prisma.attempt.aggregate({
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
  });
  const totalItems = summaryAggregate._count._all;
  const totalPages = Math.max(1, Math.ceil(totalItems / take));
  const requestedPage = filters?.page ?? 1;
  const page = Math.min(requestedPage, totalPages);
  const attempts = await prisma.attempt.findMany({
    where,
    orderBy: {
      submittedAt: 'desc',
    },
    skip: (page - 1) * take,
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
  });

  return {
    items: attempts.map((attempt) => ({
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
    page,
    limit: take,
    totalItems,
    totalPages,
    summary: {
      totalAttempts: totalItems,
      averageScore:
        totalItems > 0 && typeof summaryAggregate._avg.score === 'number'
          ? Math.round(summaryAggregate._avg.score * 10) / 10
          : 0,
      bestScore:
        totalItems > 0 && typeof summaryAggregate._max.score === 'number'
          ? summaryAggregate._max.score
          : 0,
    },
  };
};
