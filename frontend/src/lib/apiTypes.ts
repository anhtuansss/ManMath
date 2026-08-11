import type { TopicStatDto } from '../components/exam/types';

export type RecommendationWeakTopic = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
  accuracy: number;
  awardedScoreUnits: number;
  maxScoreUnits: number;
  masteryPercentage: number | null;
  analyticsConfidence: 'score_units' | 'legacy_best_effort' | 'mixed';
  reason: string;
};

export type RecommendedExam = {
  examId: string;
  title: string;
  durationMinutes: number;
  matchedWeakTopicCount: number;
  matchedWeakQuestionCount: number;
  reason: string;
  contentEngine: 'legacy' | 'v2';
};

export type AnalyticsCoverage = {
  scoreUnitAttemptCount: number;
  legacyBestEffortAttemptCount: number;
  unavailableV2AttemptCount: number;
};

export type TopicStatsResponse = {
  topicStats: TopicStatDto[];
  coverage: AnalyticsCoverage;
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
  awardedScoreUnits: number;
  maxScoreUnits: number;
  masteryPercentage: number | null;
  analyticsConfidence: 'score_units' | 'legacy_best_effort' | 'mixed';
};

export type SubtopicStatsResponse = {
  subtopicStats: SubtopicStat[];
  coverage: AnalyticsCoverage;
};

export type RecommendationsResponse = {
  weakTopics: RecommendationWeakTopic[];
  recommendedExams: RecommendedExam[];
};

export type RecentAttempt = {
  attemptId: string;
  examId: string;
  attemptFormat: 'legacy' | 'v2';
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
  attemptFormat: 'legacy' | 'v2';
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
