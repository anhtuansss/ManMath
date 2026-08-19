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
  readonly examVersionId: string;
  readonly versionNumber: number;
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
  readonly examVersionId: string;
  readonly responses: readonly RawSubmittedResponse[];
  readonly durationSeconds: number;
};

export type CreateExamContentAttemptResponseDto = {
  readonly attemptId: string;
  readonly examId: string;
  readonly examVersionId: string;
  readonly scoringPolicyId: ScoringPolicyId;
  readonly scoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
  readonly correctCount: number;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly durationSeconds: number | null;
  readonly submittedAt: string;
  readonly results: readonly GradingResult[];
  /** Present only once for anonymous attempts; never persisted as raw data. */
  readonly anonymousReceiptToken?: string;
};

export type PracticeQuestionReferenceDto = {
  readonly examVersionId: string;
  readonly questionId: string;
};

export type PublicPracticeQuestionDto = PublicQuestion & {
  /** Stable source reference, required when this public question is graded. */
  readonly reference: PracticeQuestionReferenceDto;
};

export type PublicPracticeTopicDto = {
  readonly topic: {
    readonly slug: string;
    readonly name: string;
  };
  readonly questions: readonly PublicPracticeQuestionDto[];
};

export type GradePracticeRequestDto = {
  readonly topicSlug: string;
  readonly questionRefs: readonly PracticeQuestionReferenceDto[];
  readonly responses: readonly RawSubmittedResponse[];
};

export type PracticeGradingResultDto = {
  readonly questionId: string;
  readonly response: SubmittedResponse | null;
  readonly isCorrect: boolean;
  readonly awardedScoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
};

/** Safe post-grade result: no answer keys or correct-answer fields are exposed. */
export type GradePracticeResponseDto = {
  readonly scoringPolicyId: ScoringPolicyId;
  readonly scoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
  readonly correctCount: number;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly results: readonly PracticeGradingResultDto[];
};

export type PracticeSessionQuestionDto = {
  readonly sessionQuestionId: string;
  readonly order: number;
  readonly question: PublicQuestion;
  readonly response: SubmittedResponse | null;
  readonly responseRevision: number;
  readonly result?: {
    readonly isFullyCorrect: boolean;
    readonly awardedScoreUnits: ScoreUnits;
    readonly maxScoreUnits: ScoreUnits;
  };
};

export type PracticeSessionDto = {
  readonly id: string;
  readonly status: 'in_progress' | 'completed' | 'cancelled';
  readonly topic: { readonly slug: string; readonly name: string };
  readonly startedAt: string;
  readonly submittedAt: string | null;
  readonly scoreUnits: ScoreUnits | null;
  readonly maxScoreUnits: ScoreUnits | null;
  readonly fullyCorrectCount: number | null;
  readonly totalQuestions: number;
  readonly unansweredCount: number | null;
  readonly configuration: {
    readonly topicSlug: string;
    readonly subtopicSlug: string | null;
    readonly requestedQuestionCount: number;
    readonly actualQuestionCount: number;
    readonly questionTypes: readonly ('single_choice' | 'true_false_group' | 'short_answer')[];
  };
  readonly questions: readonly PracticeSessionQuestionDto[];
};

/** Safe V2 attempt receipt. It deliberately excludes answer keys and explanations. */
export type ExamContentAttemptAnswerReceiptDto = {
  readonly questionExternalId: string;
  /** Question position from the submitted content snapshot/version. */
  readonly questionOrder: number;
  readonly questionType: QuestionInput['type'];
  readonly response: SubmittedResponse | null;
  readonly awardedScoreUnits: ScoreUnits;
  readonly maxScoreUnits: ScoreUnits;
  readonly isFullyCorrect: boolean;
};

export type ExamContentAttemptReceiptDto = {
  readonly attemptId: string;
  readonly examId: string;
  readonly examVersionId: string | null;
  /** Title from the submitted content snapshot/version. */
  readonly examTitle: string;
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
