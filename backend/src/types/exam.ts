export type ExamDifficulty = 'easy' | 'medium' | 'hard';


export const examDifficulties: ExamDifficulty[] = ['easy', 'medium', 'hard'];

export type SubtopicDto = {
  id: string;
  name: string;
  slug: string;
};

export type TopicFilterDto = {
  id: string;
  name: string;
  slug: string;
  subtopics: SubtopicDto[];
};


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

export type ExamSummaryDto = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  subject: string;
  difficulty: ExamDifficulty;
  source: string | null;
  year?: number;
  statusLabel: string;
};
