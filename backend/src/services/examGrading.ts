import type {
    CanonicalShortAnswer,
    CanonicalTolerance,
    NormalizedShortAnswerResponse,
    ScoreUnits,
    ScoringPolicyId,
    GradingResult,
    QuestionInput,
    SingleChoiceQuestionInput,
    SubmittedResponse,
    TrueFalseGroupQuestionInput,
    ShortAnswerQuestionInput,
} from '../types/examContent';

const toScoreUnits = (value: number): ScoreUnits => value as ScoreUnits;
const ZERO_SCORE_UNITS = toScoreUnits(0);

export const vietnamThptMath2025Scoring = {
    id: 'vietnam_thpt_math_2025' as ScoringPolicyId,
    singleChoiceCorrect: toScoreUnits(25),
    trueFalseByCorrectStatementCount: [
        toScoreUnits(0),
        toScoreUnits(10),
        toScoreUnits(25),
        toScoreUnits(50),
        toScoreUnits(100),
    ] as const,
    shortAnswerCorrect: toScoreUnits(50),
    maximumExamScore: toScoreUnits(1000),
} as const;

type DecimalParts = {
	readonly sign: 1 | -1;
	readonly digits: string;
	readonly scale: number;
}

type CanonicalDecimal =
    | CanonicalShortAnswer
    | CanonicalTolerance
    | NormalizedShortAnswerResponse;

function parseDecimalParts(
    value: CanonicalDecimal,
): DecimalParts {
    const sign: 1 | -1 = value.startsWith("-") ? -1 : 1;

    const unsigned = sign === -1
        ? value.slice(1)
        : value;

    const [integerPart, decimalPart] = unsigned.split(",");

    const digits = (integerPart + (decimalPart ?? '')).replace(
        /^0+(?=\d)/,
        '',
    );

    return {
        sign,
        digits,
        scale: decimalPart?.length ?? 0,
    };
}

function toScaledDigits(
    value: DecimalParts,
    targetScale: number,
): string {
    const zeroCount = targetScale - value.scale;

    return value.digits.padEnd(
        value.digits.length + zeroCount,
        '0',
    );
}

function compareUnsignedIntegerStrings(
    left: string,
    right: string,
): -1 | 0 | 1 {
    if (left.length < right.length) return -1;

    if(left.length > right.length) return 1;

    if (left === right) return 0;

    return left < right ? -1 : 1;
}

function subtractUnsignedIntegerStrings(
  larger: string,
  smaller: string,
): string {
    let borrow = 0;
    let result = '';

    let largerIndex = larger.length - 1;
    let smallerIndex = smaller.length - 1;

    while (largerIndex >= 0) {
        const largerDigit = larger.charCodeAt(largerIndex) - 48;

        const smallerDigit =
            smallerIndex >= 0
                ? smaller.charCodeAt(smallerIndex) - 48
                : 0;

        let difference = largerDigit - smallerDigit - borrow;

        if (difference < 0) {
            difference += 10;
            borrow = 1;
        }
        else {
            borrow = 0;
        }

        result = String(difference) + result;

        largerIndex -= 1;
        smallerIndex -= 1;
    }

    return result.replace(/^0+(?=\d)/, '');
}

function addUnsignedIntegerStrings(
    left: string,
    right: string,
): string {
    let carry = 0;
    let result = '';

    let leftIndex = left.length - 1;
    let rightIndex = right.length - 1;

    while (leftIndex >= 0 || rightIndex >= 0) {
        const leftDigit =
            leftIndex >= 0
                ? left.charCodeAt(leftIndex) - 48
                : 0;

        const rightDigit =
            rightIndex >= 0
                ? right.charCodeAt(rightIndex) - 48
                : 0;

        let sum = leftDigit + rightDigit + carry;

        carry = sum >= 10 ? 1 : 0;

        sum %= 10;

        result = String(sum) + result;

        leftIndex -= 1;
        rightIndex -= 1;
    }

    if (carry === 1) {
        result = "1" + result;
    }

    return result.replace(/^0+(?=\d)/, '');
}

type UnsignedDecimalParts = {
  readonly digits: string;
  readonly scale: number;
};

function absoluteDecimalDifference(
  left: DecimalParts,
  right: DecimalParts,
): UnsignedDecimalParts {
  const targetScale = Math.max(left.scale, right.scale);

  const leftDigits = toScaledDigits(left, targetScale);
  const rightDigits = toScaledDigits(right, targetScale);

  let differenceDigits: string;

  if (left.sign === right.sign) {
    const comparison = compareUnsignedIntegerStrings(
      leftDigits,
      rightDigits,
    );

    differenceDigits =
      comparison >= 0
        ? subtractUnsignedIntegerStrings(leftDigits, rightDigits)
        : subtractUnsignedIntegerStrings(rightDigits, leftDigits);
  } else {
    differenceDigits = addUnsignedIntegerStrings(
      leftDigits,
      rightDigits,
    );
  }

  return {
    digits: differenceDigits,
    scale: targetScale,
  };
}

function areNumericallyEqual(
  left: DecimalParts,
  right: DecimalParts,
): boolean {
  return absoluteDecimalDifference(left, right).digits === '0';
}

function isWithinTolerance(
  response: DecimalParts,
  answer: DecimalParts,
  tolerance: DecimalParts,
): boolean {
  const difference = absoluteDecimalDifference(response, answer);

  const targetScale = Math.max(
    difference.scale,
    tolerance.scale,
  );

  const scaledDifference = difference.digits.padEnd(
    difference.digits.length + targetScale - difference.scale,
    '0',
  );

  const scaledTolerance = toScaledDigits(
    tolerance,
    targetScale,
  );

  return (
    compareUnsignedIntegerStrings(
      scaledDifference,
      scaledTolerance,
    ) <= 0
  );
}

type SingleChoiceSubmittedResponse = Extract<
  SubmittedResponse,
  { readonly type: 'single_choice' }
>;

function gradeSingleChoiceQuestion(
  question: SingleChoiceQuestionInput,
  response: SingleChoiceSubmittedResponse | undefined,
): GradingResult {
  if (response === undefined) {
    return {
      questionId: question.id,
      isCorrect: false,
      awardedScore: ZERO_SCORE_UNITS,
    };
  }

  const isCorrect =
    response.choiceId === question.answerKey.correctChoiceId;

  return {
    questionId: question.id,
    response,
    isCorrect,
    awardedScore: isCorrect
      ? vietnamThptMath2025Scoring.singleChoiceCorrect
      : ZERO_SCORE_UNITS,
  };
}

type TrueFalseSubmittedResponse = Extract<
  SubmittedResponse,
  { readonly type: 'true_false_group' }
>;

function gradeTrueFalseGroupQuestion(
  question: TrueFalseGroupQuestionInput,
  response: TrueFalseSubmittedResponse | undefined,
): GradingResult {
  if (response === undefined) {
    return {
      questionId: question.id,
      isCorrect: false,
      awardedScore: ZERO_SCORE_UNITS,
    };
  }

  let correctStatementCount = 0;

  for (const statement of question.statements) {
    if (
      response.values[statement.id] ===
      question.answerKey.values[statement.id]
    ) {
      correctStatementCount += 1;
    }
  }

  return {
    questionId: question.id,
    response,
    isCorrect: correctStatementCount === 4,
    awardedScore:
      vietnamThptMath2025Scoring.trueFalseByCorrectStatementCount[
        correctStatementCount
      ],
  };
}

type ShortAnswerSubmittedResponse = Extract<
  SubmittedResponse,
  { readonly type: 'short_answer' }
>;

function gradeShortAnswerQuestion(
  question: ShortAnswerQuestionInput,
  response: ShortAnswerSubmittedResponse | undefined,
): GradingResult {
  if (response === undefined) {
    return {
      questionId: question.id,
      isCorrect: false,
      awardedScore: ZERO_SCORE_UNITS,
    };
  }

  const responseDecimal = parseDecimalParts(response.response);
  const answerKey = question.answerKey;

  const isCorrect =
    answerKey.mode === 'exact'
      ? String(response.response) === String(answerKey.answer)
      : answerKey.mode === 'numeric'
        ? areNumericallyEqual(
            responseDecimal,
            parseDecimalParts(answerKey.answer),
          )
        : isWithinTolerance(
            responseDecimal,
            parseDecimalParts(answerKey.answer),
            parseDecimalParts(answerKey.tolerance),
          );

  return {
    questionId: question.id,
    response,
    isCorrect,
    awardedScore: isCorrect
      ? vietnamThptMath2025Scoring.shortAnswerCorrect
      : ZERO_SCORE_UNITS,
  };
}

export function gradeQuestion(
  question: QuestionInput,
  response: SubmittedResponse | undefined,
): GradingResult {
  if (response !== undefined && response.type !== question.type) {
    throw new Error(
      `Response type ${response.type} does not match question type ${question.type}`,
    );
  }

  switch (question.type) {
    case 'single_choice':
      return gradeSingleChoiceQuestion(
        question,
        response?.type === 'single_choice' ? response : undefined,
      );
    case 'true_false_group':
      return gradeTrueFalseGroupQuestion(
        question,
        response?.type === 'true_false_group' ? response : undefined,
      );
    case 'short_answer':
      return gradeShortAnswerQuestion(
        question,
        response?.type === 'short_answer' ? response : undefined,
      );
  }
}
