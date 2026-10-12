export type ExamDifficulty = 'easy' | 'medium' | 'hard';

export type ExamDurationFilter = 'all' | 'short' | 'standard' | 'long';

export type ExamSummaryDto = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly totalQuestions: number;
  readonly subject: string;
  readonly difficulty: ExamDifficulty;
  readonly year?: number;
  readonly source: string | null;
  readonly type?: string;
  readonly statusLabel: string;
};

export type ExamListApiItem = ExamSummaryDto;

export type ExamListItem = ExamSummaryDto & {
  readonly href: string;
};

export type TopicFilterDto = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly subtopics: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  }[];
};

export type TopicsResponseDto = {
  readonly topics: TopicFilterDto[];
};
