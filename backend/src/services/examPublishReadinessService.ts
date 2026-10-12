import type { QuestionInput, ScoringPolicyId } from '../types/examContent';
import { validateQuestionInput } from '../types/examContentValidation';
import { validateV2ExamQuestionSet } from './examContentReadService';
import { vietnamThptMath2025Scoring } from './examGrading';

export type PublishProfile = 'official_full_exam' | 'practice';

export type PublishReadinessInput = {
  readonly publishProfile: PublishProfile;
  readonly durationMinutes: number;
  readonly scoringPolicyId: ScoringPolicyId;
  readonly questions: readonly QuestionInput[];
};

export type PublishReadinessResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly string[] };

const expectedCountByType: Readonly<Record<QuestionInput['type'], number>> = {
  single_choice: 12,
  true_false_group: 4,
  short_answer: 6,
};

const expectedSectionByType: Readonly<Record<QuestionInput['type'], 1 | 2 | 3>> = {
  single_choice: 1,
  true_false_group: 2,
  short_answer: 3,
};

const officialMaximumScoreUnits =
  expectedCountByType.single_choice * vietnamThptMath2025Scoring.singleChoiceCorrect +
  expectedCountByType.true_false_group * vietnamThptMath2025Scoring.trueFalseByCorrectStatementCount[4] +
  expectedCountByType.short_answer * vietnamThptMath2025Scoring.shortAnswerCorrect;

/** Validates a candidate version immediately before it may be published. */
export function validateExamPublishReadiness(
  input: PublishReadinessInput,
): PublishReadinessResult {
  const issues: string[] = [];
  const runtimeQuestions: QuestionInput[] = [];

  for (const [index, question] of input.questions.entries()) {
    const result = validateQuestionInput(question);
    if (!result.ok) {
      issues.push(`questions[${index}] ${result.message}`);
      continue;
    }
    runtimeQuestions.push(result.value);
  }

  validateV2ExamQuestionSet(runtimeQuestions, issues);

  if (input.publishProfile === 'practice') {
    return issues.length === 0 ? { ok: true } : { ok: false, issues };
  }

  if (input.durationMinutes !== 90) {
    issues.push('official_full_exam duration must be exactly 90 minutes');
  }
  if (input.scoringPolicyId !== 'vietnam_thpt_math_2025') {
    issues.push('official_full_exam requires vietnam_thpt_math_2025 scoring policy');
  }
  if (runtimeQuestions.length !== 22) {
    issues.push('official_full_exam must contain exactly 22 question containers');
  }

  for (const type of Object.keys(expectedCountByType) as QuestionInput['type'][]) {
    const count = runtimeQuestions.filter((question) => question.type === type).length;
    if (count !== expectedCountByType[type]) {
      issues.push(`official_full_exam requires ${expectedCountByType[type]} ${type} questions, received ${count}`);
    }
    if (runtimeQuestions.some((question) => question.type === type && question.section !== expectedSectionByType[type])) {
      issues.push(`${type} questions must belong to section ${expectedSectionByType[type]}`);
    }
  }

  const orders = runtimeQuestions.map((question) => question.order).sort((a, b) => a - b);
  const hasContinuousOrder = orders.length === 22 && orders.every((order, index) => order === index + 1);
  if (!hasContinuousOrder) {
    issues.push('official_full_exam orders must be continuous from 1 through 22');
  }
  if (officialMaximumScoreUnits !== 1000) {
    issues.push('official scoring configuration does not total 1000 score units');
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
