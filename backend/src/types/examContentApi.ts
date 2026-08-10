import type { ExamDifficulty } from '@prisma/client';
import type {
  CanonicalShortAnswer,
  CanonicalTolerance,
  ChoiceId,
  PublicQuestion,
  GradingResult,
  QuestionInput,
  RawSubmittedResponse,
  ScoreUnits,
  ScoringPolicyId,
  SubmittedResponse,
  StatementId,
} from './examContent';

export type PublicExamContentDto = {
  readonly id: string;
  readonly title: string;
  readonly durationMinutes: number;
  readonly subject: string;
  readonly difficulty: ExamDifficulty;
  readonly source: string | null;
  readonly year: number | null;
  readonly statusLabel: string;
  readonly questions: readonly PublicQuestion[];
};

export type GradeExamContentRequestDto = {
  readonly responses: readonly RawSubmittedResponse[];
};

export type GradeExamContentResponseDto = {
  readonly scoringPolicyId: ScoringPolicyId;
  readonly totalAwardedScore: ScoreUnits;
  readonly maxScore: ScoreUnits;
  readonly results: readonly GradingResult[];
};

export type CreateExamContentAttemptRequestDto = {
  readonly responses: readonly RawSubmittedResponse[];
  readonly durationSeconds?: number;
};

export type CreateExamContentAttemptResponseDto = {
  readonly attemptId: string;
  readonly examId: string;
  readonly scoringPolicyId: ScoringPolicyId;
  readonly scoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
  readonly correctCount: number;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly durationSeconds: number | null;
  readonly submittedAt: string;
  readonly results: readonly GradingResult[];
};

/** Safe V2 attempt receipt. It deliberately excludes answer keys and explanations. */
export type ExamContentAttemptAnswerReceiptDto = {
  readonly questionExternalId: string;
  readonly questionType: QuestionInput['type'];
  readonly response: SubmittedResponse | null;
  readonly awardedScoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
  readonly isFullyCorrect: boolean;
};

export type ExamContentAttemptReceiptDto = {
  readonly attemptId: string;
  readonly examId: string;
  readonly submittedAt: string;
  readonly durationSeconds: number | null;
  readonly scoringPolicyId: ScoringPolicyId;
  readonly scoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly answers: readonly ExamContentAttemptAnswerReceiptDto[];
};

export type AttemptReviewCorrectAnswer =
  | {
      readonly type: 'single_choice';
      readonly correctChoiceId: ChoiceId;
    }
  | {
      readonly type: 'true_false_group';
      readonly values: Readonly<Record<StatementId, boolean>>;
    }
  | {
      readonly type: 'short_answer';
      readonly mode: 'exact' | 'numeric' | 'numeric_with_tolerance';
      readonly answer: CanonicalShortAnswer;
      readonly tolerance?: CanonicalTolerance;
    };

export type ExamContentAttemptReviewQuestionDto = PublicQuestion & {
  readonly studentResponse: SubmittedResponse | null;
  readonly awardedScoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
  readonly isFullyCorrect: boolean;
  readonly correctAnswer: AttemptReviewCorrectAnswer;
};

export type ExamContentAttemptReviewDto = {
  readonly attemptId: string;
  readonly examId: string;
  readonly submittedAt: string;
  readonly durationSeconds: number | null;
  readonly scoringPolicyId: ScoringPolicyId;
  readonly scoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly questions: readonly ExamContentAttemptReviewQuestionDto[];
};
