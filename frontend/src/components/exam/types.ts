/**
 * Mục đích:
 * Tập trung các type frontend dùng cho giao diện làm bài, API DTO
 * và dữ liệu kết quả lưu tạm.
 *
 * Luồng dữ liệu:
 * Backend trả DTO qua API. Frontend chuyển một số DTO thành dữ liệu cho UI,
 * sau đó lưu nháp đáp án hoặc kết quả tạm vào localStorage/sessionStorage.
 *
 * File liên quan:
 * backend/src/data/mockExams.ts
 * frontend/src/components/exam/ExamListClient.tsx
 * frontend/src/components/exam/ExamTakingClient.tsx
 * frontend/src/components/exam/ExamResultClient.tsx
 */
export type QuestionDto = {
  id: number;
  question: string;
  imageUrl?: string | null;
  explanation?: string | null;
  options: string[];
  optionImageUrls?: (string | null)[];
  subtopic?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  correctAnswer: string;
};

export type Question = QuestionDto;

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

export type ExamResponse = ExamDetailDto;

export type Answers = Record<number, number>;

export type SubmitExamRequestDto = {
  examId?: string;
  answers: Answers;
  durationSeconds?: number;
};

export type SubmitRequest = SubmitExamRequestDto;

export type SubmitExamResultDto = {
  correctCount: number;
  totalQuestions: number;
  score: number;
  topicStats: TopicStatDto[];
};

export type SubmitResult = SubmitExamResultDto;

export type ExamDifficulty = 'easy' | 'medium' | 'hard';

export type ExamDurationFilter =
  | 'all'
  | 'short'
  | 'standard'
  | 'long';

export type ExamSummaryDto = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  subject: string;
  difficulty: ExamDifficulty;
  year?: number;
  source: string | null;
  type?: string;
  statusLabel: string;
};

export type TopicFilterDto = {
  id: string;
  name: string;
  slug: string;
  subtopics: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export type TopicsResponseDto = {
  topics: TopicFilterDto[];
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

export type ExamListItem = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  subject: string;
  difficulty: ExamDifficulty;
  year?: number;
  source: string | null;
  type?: string;
  statusLabel: string;
  href: string;
};

// Dữ liệu API của danh sách đề không có href; frontend tự gắn href để điều hướng.
export type ExamListApiItem = ExamSummaryDto;

// Dữ liệu API của thống kê theo chủ đề, dùng trong trang kết quả và chi tiết kết quả
export type TopicStatDto = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
  accuracy: number;
};

// Dữ liệu API của danh sách số lần làm
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

// Dữ liệu API của từng câu trả lời
export type AttemptAnswerDetailDto = {
  questionId: number;
  question: string;
  imageUrl?: string | null;
  explanation?: string | null;
  options: string[];
  optionImageUrls?: (string | null)[];
  subtopic?: {
    id: string;
    name: string;
    slug: string;
  } | null;
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

// Model lưu tạm trong sessionStorage sau khi nộp bài, không phải API DTO.
export type ExamResultSession = {
  examId: string;
  examTitle: string;
  submittedAt: string;
  answers: Answers;
  submitResult: SubmitExamResultDto;
  exam?: ExamDetailDto;
};

// Model lưu nháp tiến độ làm bài trong localStorage
export type ExamDraftSession = {
  answers: Answers;
  remainingSeconds: number;
  updatedAt: number;
};
