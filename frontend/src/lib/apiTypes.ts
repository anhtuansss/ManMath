export type TopicStatDto = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
  accuracy: number;
  awardedScoreUnits: number;
  maxScoreUnits: number;
  masteryPercentage: number | null;
};

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

export type AnalyticsCoverage = {
  scoreUnitAttemptCount: number;
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

export type LearningAggregate = {
  topicSlug: string; topicName: string; subtopicSlug: string | null; subtopicName: string | null;
  answeredCount: number; fullyCorrectCount: number; earnedScoreUnits: number; maxScoreUnits: number;
  masteryPercent: number | null; confidence: 'insufficient' | 'low' | 'usable';
  status: 'insufficient_data' | 'developing' | 'proficient' | 'strong'; isWeak: boolean;
  examQuestionCount: number; practiceQuestionCount: number; lastPracticedAt: string | null;
  corpusAvailableQuestionCount: number; corpusStatus: 'available' | 'insufficient';
};
export type LearningOverviewResponse = {
  overall: Omit<LearningAggregate, 'topicSlug' | 'topicName' | 'subtopicSlug' | 'subtopicName' | 'corpusAvailableQuestionCount' | 'corpusStatus'>;
  topics: LearningAggregate[]; subtopics: LearningAggregate[];
  recentActivity: { sourceType: 'exam' | 'practice'; id: string; title: string; completedAt: string; earnedScoreUnits: number; maxScoreUnits: number; fullyCorrectCount: number; totalQuestions: number }[];
  continueItems: { sourceType: 'practice'; sessionId: string; title: string; topicSlug: string; subtopicSlug: string | null; startedAt: string }[];
  nextAction: { topicSlug: string; subtopicSlug: string; title: string; reason: string; corpusAvailableQuestionCount: number; kind: 'needs_practice' | 'assess' | 'starter' } | null;
  coverage: { scoreUnitAttemptCount: number; unavailableV2AttemptCount: number; examFactCount: number; practiceFactCount: number };
};
