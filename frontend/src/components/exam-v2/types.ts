export type V2QuestionAssetDto = {
  readonly src: string;
  readonly alt: string;
};

export type V2ChoiceDto = {
  readonly id: string;
  readonly content: string;
  readonly assets?: readonly V2QuestionAssetDto[];
};

export type V2TrueFalseStatementDto = {
  readonly id: string;
  readonly content: string;
};

type V2SharedQuestionDto = {
  readonly id: string;
  readonly section: 1 | 2 | 3;
  readonly order: number;
  readonly content: string;
  readonly topicSlug: string;
  readonly subtopicSlug?: string;
  readonly assets?: readonly V2QuestionAssetDto[];
};

export type V2SingleChoiceQuestionDto = V2SharedQuestionDto & {
  readonly type: 'single_choice';
  readonly choices: readonly [V2ChoiceDto, V2ChoiceDto, V2ChoiceDto, V2ChoiceDto];
};

export type V2TrueFalseGroupQuestionDto = V2SharedQuestionDto & {
  readonly type: 'true_false_group';
  readonly statements: readonly [
    V2TrueFalseStatementDto,
    V2TrueFalseStatementDto,
    V2TrueFalseStatementDto,
    V2TrueFalseStatementDto,
  ];
};

export type V2ShortAnswerQuestionDto = V2SharedQuestionDto & {
  readonly type: 'short_answer';
};

/** Public DTO: this union intentionally has no answerKey field. */
export type V2PublicQuestionDto =
  | V2SingleChoiceQuestionDto
  | V2TrueFalseGroupQuestionDto
  | V2ShortAnswerQuestionDto;

export type V2PracticeQuestionReference = {
  readonly examVersionId: string;
  readonly questionId: string;
};

export type V2PublicPracticeQuestionDto = V2PublicQuestionDto & {
  readonly reference: V2PracticeQuestionReference;
};

export type V2PublicPracticeTopicDto = {
  readonly topic: {
    readonly slug: string;
    readonly name: string;
  };
  readonly questions: readonly V2PublicPracticeQuestionDto[];
};

export type V2PublicExamDto = {
  readonly id: string;
  readonly examVersionId: string;
  readonly versionNumber: number;
  readonly title: string;
  readonly durationMinutes: number;
  readonly subject: string;
  readonly difficulty: string;
  readonly source: string | null;
  readonly year: number | null;
  readonly statusLabel: string;
  readonly questions: readonly V2PublicQuestionDto[];
};

export type V2SingleChoiceAnswer = {
  readonly type: 'single_choice';
  readonly choiceId: string;
};

export type V2TrueFalseGroupAnswer = {
  readonly type: 'true_false_group';
  readonly values: Readonly<Record<string, boolean>>;
};

export type V2ShortAnswer = {
  readonly type: 'short_answer';
  readonly value: string;
};

export type V2AnswerState =
  | V2SingleChoiceAnswer
  | V2TrueFalseGroupAnswer
  | V2ShortAnswer;

export type V2AnswersByQuestionId = Readonly<Record<string, V2AnswerState>>;

export type V2RawSubmittedResponse =
  | ({ readonly questionId: string } & V2SingleChoiceAnswer)
  | ({ readonly questionId: string } & V2TrueFalseGroupAnswer)
  | ({ readonly questionId: string } & V2ShortAnswer);

export type V2SubmittedResponse =
  | V2SingleChoiceAnswer
  | {
      readonly type: 'true_false_group';
      readonly values: Readonly<Record<string, boolean>>;
    }
  | {
      readonly type: 'short_answer';
      readonly response: string;
    };

export type V2GradingResultDto = {
  readonly questionId: string;
  readonly response?: V2SubmittedResponse;
  readonly isCorrect: boolean;
  readonly awardedScore: number;
};

export type V2CreateAttemptResponseDto = {
  readonly attemptId: string;
  readonly examId: string;
  readonly examVersionId: string;
  readonly scoringPolicyId: 'vietnam_thpt_math_2025';
  readonly scoreUnits: number;
  readonly maxScoreUnits: number;
  readonly correctCount: number;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly durationSeconds: number | null;
  readonly submittedAt: string;
  readonly results: readonly V2GradingResultDto[];
  /** Returned once for anonymous attempts; never place this token in a URL. */
  readonly anonymousReceiptToken?: string;
};

export type V2PracticeGradingResultDto = {
  readonly questionId: string;
  readonly response: V2SubmittedResponse | null;
  readonly isCorrect: boolean;
  readonly awardedScoreUnits: number;
  readonly maxScoreUnits: number;
};

export type V2PracticeGradeResponseDto = {
  readonly scoringPolicyId: 'vietnam_thpt_math_2025';
  readonly scoreUnits: number;
  readonly maxScoreUnits: number;
  readonly correctCount: number;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly results: readonly V2PracticeGradingResultDto[];
};

/** Persistent authenticated practice; intentionally contains no answer keys. */
export type V2PracticeSessionQuestionDto = {
  readonly sessionQuestionId: string;
  readonly order: number;
  readonly question: V2PublicQuestionDto;
  readonly response: V2SubmittedResponse | null;
  readonly responseRevision: number;
  readonly result?: { readonly isFullyCorrect: boolean; readonly awardedScoreUnits: number; readonly maxScoreUnits: number };
};

export type V2PracticeSessionDto = {
  readonly id: string;
  readonly status: 'in_progress' | 'completed' | 'cancelled';
  readonly topic: { readonly slug: string; readonly name: string };
  readonly startedAt: string;
  readonly submittedAt: string | null;
  readonly scoreUnits: number | null;
  readonly maxScoreUnits: number | null;
  readonly fullyCorrectCount: number | null;
  readonly totalQuestions: number;
  readonly unansweredCount: number | null;
  readonly configuration: {
    readonly topicSlug: string;
    readonly subtopicSlug: string | null;
    readonly requestedQuestionCount: number;
    readonly actualQuestionCount: number;
    readonly questionTypes: readonly V2PublicQuestionDto['type'][];
  };
  readonly questions: readonly V2PracticeSessionQuestionDto[];
};

export type V2AttemptReceiptAnswerDto = {
  readonly questionExternalId: string;
  readonly questionOrder: number;
  readonly questionType: V2PublicQuestionDto['type'];
  readonly response: V2SubmittedResponse | null;
  readonly awardedScoreUnits: number;
  readonly maxScoreUnits: number;
  readonly isFullyCorrect: boolean;
};

export type V2AttemptReceiptDto = {
  readonly attemptId: string;
  readonly examId: string;
  readonly examVersionId: string | null;
  readonly examTitle: string;
  readonly submittedAt: string;
  readonly durationSeconds: number | null;
  readonly scoringPolicyId: 'vietnam_thpt_math_2025';
  readonly scoreUnits: number;
  readonly maxScoreUnits: number;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly answers: readonly V2AttemptReceiptAnswerDto[];
};

type V2ReviewOutcome = {
  readonly studentResponse: V2SubmittedResponse | null;
  readonly awardedScoreUnits: number;
  readonly maxScoreUnits: number;
  readonly isFullyCorrect: boolean;
};

export type V2SingleChoiceReviewQuestionDto = V2SingleChoiceQuestionDto & V2ReviewOutcome & {
  readonly correctAnswer: {
    readonly type: 'single_choice';
    readonly correctChoiceId: string;
  };
};

export type V2TrueFalseGroupReviewQuestionDto = V2TrueFalseGroupQuestionDto & V2ReviewOutcome & {
  readonly correctAnswer: {
    readonly type: 'true_false_group';
    readonly values: Readonly<Record<string, boolean>>;
  };
};

export type V2ShortAnswerReviewQuestionDto = V2ShortAnswerQuestionDto & V2ReviewOutcome & {
  readonly correctAnswer: {
    readonly type: 'short_answer';
    readonly mode: 'exact' | 'numeric' | 'numeric_with_tolerance';
    readonly answer: string;
    readonly tolerance?: string;
  };
};

export type V2AttemptReviewQuestionDto =
  | V2SingleChoiceReviewQuestionDto
  | V2TrueFalseGroupReviewQuestionDto
  | V2ShortAnswerReviewQuestionDto;

export type V2AttemptReviewDto = {
  readonly attemptId: string;
  readonly examId: string;
  readonly submittedAt: string;
  readonly durationSeconds: number | null;
  readonly scoringPolicyId: 'vietnam_thpt_math_2025';
  readonly scoreUnits: number;
  readonly maxScoreUnits: number;
  readonly totalQuestions: number;
  readonly unansweredCount: number;
  readonly questions: readonly V2AttemptReviewQuestionDto[];
};

export type V2ExamDraft = {
  readonly version: 4;
  readonly examId: string;
  readonly examVersionId: string;
  readonly timingSessionId: string;
  readonly anonymousTimingSessionToken?: string;
  readonly deadlineAt: number;
  readonly answers: V2AnswersByQuestionId;
  readonly currentQuestionId: string | null;
  readonly viewMode: 'all' | 'single';
  readonly submissionKey: string;
  readonly updatedAt: number;
};

export type V2ExamResultSession = {
  readonly version: 1;
  readonly examId: string;
  readonly examTitle: string;
  readonly wasAuthenticated: boolean;
  readonly result: V2CreateAttemptResponseDto;
};
