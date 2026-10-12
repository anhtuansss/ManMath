import type {
  QuestionInput,
} from './examContent';
import type {
  ExamContentSnapshotV1,
} from './examContentSnapshot';
import {
  isRecord,
  type ValidationResult,
  validateQuestionInput,
} from './examContentValidation';

const expectedQuestionTypeBySection: Readonly<
  Record<1 | 2 | 3, QuestionInput['type']>
> = {
  1: 'single_choice',
  2: 'true_false_group',
  3: 'short_answer',
};

export function validateExamContentSnapshotV1(
  value: unknown,
): ValidationResult<ExamContentSnapshotV1> {
  if (!isRecord(value)) {
    return {
        ok: false,
        message: 'Exam content snapshot must be an object',
    };
  }

  if (value.version !== 1) {
    return {
        ok: false,
        message: 'Exam content snapshot version must be 1',
    };
  }

  if (!isRecord(value.exam)) {
    return {
      ok: false,
      message: 'Exam content snapshot exam must be an object',
    };
  }

  const exam = value.exam;

  if (typeof exam.id !== 'string' || exam.id.trim().length === 0) {
    return {
      ok: false,
      message: 'Snapshot exam id must be a non-empty string',
    };
  }

  if (typeof exam.title !== 'string' || exam.title.trim().length === 0) {
    return {
      ok: false,
      message: 'Snapshot exam title must be a non-empty string',
    };
  }

  if (
    typeof exam.durationMinutes !== 'number' ||
    !Number.isInteger(exam.durationMinutes) ||
    exam.durationMinutes <= 0
  ) {
    return {
      ok: false,
      message: 'Snapshot exam durationMinutes must be a positive integer',
    };
  }

  if (
    typeof exam.subject !== 'string' ||
    exam.subject.trim().length === 0
  ) {
    return {
      ok: false,
      message: 'Snapshot exam subject must be a non-empty string',
    };
  }

  if (exam.scoringPolicyId !== 'vietnam_thpt_math_2025') {
    return {
      ok: false,
      message: 'Snapshot scoring policy is unsupported',
    };
  }

  if (!Array.isArray(value.questions) || value.questions.length === 0) {
    return {
      ok: false,
      message: 'Snapshot questions must be a non-empty array',
    };
  }

  const questions: QuestionInput[] = [];
  const questionIds = new Set<string>();
  const orders = new Set<number>();

  for (const [index, rawQuestion] of value.questions.entries()) {
    const questionResult = validateQuestionInput(rawQuestion);

    if (!questionResult.ok) {
      return {
        ok: false,
        message: `Snapshot questions[${index}] ${questionResult.message}`,
      };
    }

    const question = questionResult.value;

    if (questionIds.has(question.id)) {
      return {
        ok: false,
        message: `Snapshot contains duplicate question id: ${question.id}`,
      };
    }

    if (orders.has(question.order)) {
      return {
        ok: false,
        message: `Snapshot contains duplicate question order: ${question.order}`,
      };
    }

    if (
      question.type !==
      expectedQuestionTypeBySection[question.section]
    ) {
      return {
        ok: false,
        message: `Snapshot question ${question.id} has an invalid section/type combination`,
      };
    }

    questionIds.add(question.id);
    orders.add(question.order);
    questions.push(question);
  }

  return {
    ok: true,
    value: {
      version: 1,
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        subject: exam.subject,
        scoringPolicyId: exam.scoringPolicyId,
      },
      questions,
    },
  };
}