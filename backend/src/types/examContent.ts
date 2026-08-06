declare const questionIdBrand: unique symbol;
declare const choiceIdBrand: unique symbol;
declare const statementIdBrand: unique symbol;
declare const scoreUnitsBrand: unique symbol;
declare const canonicalShortAnswerBrand: unique symbol;
declare const canonicalToleranceBrand: unique symbol;
declare const normalizedShortAnswerResponseBrand: unique symbol;

export type QuestionId = string & {
  readonly [questionIdBrand]: true;
};

export type ChoiceId = string & {
  readonly [choiceIdBrand]: true;
};

export type StatementId = string & {
  readonly [statementIdBrand]: true;
};

export type ScoreUnits = number & {
  readonly [scoreUnitsBrand]: true;
};

export type ScoringPolicyId =
  | 'vietnam_thpt_math_2025'
  | 'manmath_equal_weight_v1';

export type QuestionSection = 1 | 2 | 3;

export type QuestionAssetInput = {
  readonly src: string;
  readonly alt: string;
};

export type SharedQuestionFields = {
  readonly id: QuestionId;
  readonly section: QuestionSection;
  readonly order: number;
  readonly content: string;
  readonly topicSlug: string;
  readonly subtopicSlug?: string;
  readonly assets?: readonly QuestionAssetInput[];
};

export type ChoiceInput = {
  readonly id: ChoiceId;
  readonly content: string;
  readonly assets?: readonly QuestionAssetInput[];
};

export type SingleChoiceAnswerKey = {
  readonly correctChoiceId: ChoiceId;
};

export type SingleChoiceQuestionInput = SharedQuestionFields & {
  readonly type: 'single_choice';
  readonly choices: readonly [
    ChoiceInput,
    ChoiceInput,
    ChoiceInput,
    ChoiceInput,
  ];
  readonly answerKey: SingleChoiceAnswerKey;
};

export type TrueFalseStatementInput = {
  readonly id: StatementId;
  readonly content: string;
};

export type TrueFalseAnswerKey = {
  readonly values: Readonly<Record<StatementId, boolean>>;
};

export type TrueFalseGroupQuestionInput = SharedQuestionFields & {
  readonly type: 'true_false_group';
  readonly statements: readonly [
    TrueFalseStatementInput,
    TrueFalseStatementInput,
    TrueFalseStatementInput,
    TrueFalseStatementInput,
  ];
  readonly answerKey: TrueFalseAnswerKey;
};

export type CanonicalShortAnswer = string & {
  readonly [canonicalShortAnswerBrand]: true;
};

export type CanonicalTolerance = string & {
  readonly [canonicalToleranceBrand]: true;
};

export type ShortAnswerMode =
  | 'exact'
  | 'numeric'
  | 'numeric_with_tolerance';

export type ShortAnswerAnswerKey =
  | {
      readonly mode: 'exact';
      readonly answer: CanonicalShortAnswer;
    }
  | {
      readonly mode: 'numeric';
      readonly answer: CanonicalShortAnswer;
    }
  | {
      readonly mode: 'numeric_with_tolerance';
      readonly answer: CanonicalShortAnswer;
      readonly tolerance: CanonicalTolerance;
    };

export type ShortAnswerQuestionInput = SharedQuestionFields & {
  readonly type: 'short_answer';
  readonly answerKey: ShortAnswerAnswerKey;
};

export type NormalizedShortAnswerResponse = string & {
  readonly [normalizedShortAnswerResponseBrand]: true;
};

export type RawSubmittedResponse =
  | {
      readonly questionId: unknown;
      readonly type: 'single_choice';
      readonly choiceId: unknown;
    }
  | {
      readonly questionId: unknown;
      readonly type: 'true_false_group';
      readonly values: unknown;
    }
  | {
      readonly questionId: unknown;
      readonly type: 'short_answer';
      readonly value: unknown;
    };

export type SubmittedResponse =
  | {
      readonly type: 'single_choice';
      readonly choiceId: ChoiceId;
    }
  | {
      readonly type: 'true_false_group';
      readonly values: Readonly<Record<StatementId, boolean>>;
    }
  | {
      readonly type: 'short_answer';
      readonly response: NormalizedShortAnswerResponse;
    };

export type GradingResult = {
  readonly questionId: QuestionId;
  readonly response: SubmittedResponse;
  readonly isCorrect: boolean;
  readonly awardedScore: ScoreUnits;
};

export type QuestionInput =
  | SingleChoiceQuestionInput
  | TrueFalseGroupQuestionInput
  | ShortAnswerQuestionInput;

type WithoutAnswerKey<T> = T extends QuestionInput
  ? Omit<T, 'answerKey'>
  : never;

export type PublicQuestion = WithoutAnswerKey<QuestionInput>;
