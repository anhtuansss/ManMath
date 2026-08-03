import type { TopicStatDto } from '../components/exam/types';

export type RecommendationWeakTopic = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
  accuracy: number;
  reason: string;
};

export type RecommendedExam = {
  examId: string;
  title: string;
  durationMinutes: number;
  matchedWeakTopicCount: number;
  matchedWeakQuestionCount: number;
  reason: string;
};

export type TopicStatsResponse = {
  topicStats: TopicStatDto[];
};

export type SubtopicStat = {
  subtopicSlug: string;
  subtopicName: string;
  topicSlug: string;
  topicName: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  weak: boolean;
};

export type SubtopicStatsResponse = {
  subtopicStats: SubtopicStat[];
};

export type RecommendationsResponse = {
  weakTopics: RecommendationWeakTopic[];
  recommendedExams: RecommendedExam[];
};

export type RecentAttempt = {
  attemptId: string;
  examId: string;
  examTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
};

export type ProgressSummary = {
  attemptCount: number;
  averageScore: number;
  bestScore: number;
  latestScore: number | null;
};

export type ProgressAttemptPoint = {
  attemptId: string;
  examTitle: string;
  score: number;
  accuracy: number;
  submittedAt: string;
};

export type ProgressResponse = {
  summary: ProgressSummary;
  recentAttempts: RecentAttempt[];
  progressByAttempt: ProgressAttemptPoint[];
};

export type HistoryAttempt = {
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

export type HistorySummary = {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
};

export type UserAttemptsResponse = {
  items: HistoryAttempt[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  summary: HistorySummary;
};
