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

export type PracticeTopicDto = {
  practiceId: string;
  topic: {
    name: string;
    slug: string;
  };
  title: string;
  durationMinutes: number;
  questions: QuestionDto[];
};

export type QuestionDto = {
  id: number;
  question: string;
  imageUrl: string | null;
  explanation: string | null;
  options: string[];
  optionImageUrls: (string | null)[];
  subtopic: SubtopicDto | null;
  correctAnswer: string;
};

export type TopicStatDto = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
  accuracy: number;
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

export type ExamDetailDto = {
  id: string;
  examTitle: string;
  durationMinutes: number;
  subject: string;
  difficulty: ExamDifficulty;
  source: string | null;
  year: number | null;
  statusLabel: string;
  questions: QuestionDto[];
};

export type ExamAttemptSummaryDto = {
  id: string;
  examId: string;
  attemptFormat: 'legacy' | 'v2';
  score: number;
  correctCount: number;
  totalQuestions: number;
  unansweredCount: number;
  durationSeconds: number | null;
  submittedAt: string;
};

export type AttemptAnswerDetailDto = {
  questionId: number;
  question: string;
  imageUrl: string | null;
  explanation: string | null;
  options: string[];
  optionImageUrls: (string | null)[];
  subtopic: SubtopicDto | null;
  selectedOptionIndex: number | null;
  correctOptionIndex: number;
  isCorrect: boolean;
};

export type ExamAttemptDetailDto = {
  attempt: ExamAttemptSummaryDto;
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
  };
  answers: AttemptAnswerDetailDto[];
  topicStats: TopicStatDto[];
};
