import type { Prisma, QuestionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type {
  PublicQuestion,
  QuestionInput,
} from '../types/examContent';
import type { PublicExamContentDto } from '../types/examContentApi';
import { validateQuestionInput } from '../types/examContentValidation';

type PersistedV2QuestionRecord = {
  readonly id: number;
  readonly externalId: string | null;
  readonly type: QuestionType;
  readonly section: number | null;
  readonly order: number;
  readonly question: string;
  readonly assets: Prisma.JsonValue | null;
  readonly choices: Prisma.JsonValue | null;
  readonly statements: Prisma.JsonValue | null;
  readonly answerKey: Prisma.JsonValue | null;
  readonly topic: {
    readonly slug: string;
  } | null;
  readonly subtopic: {
    readonly slug: string;
    readonly topic: {
      readonly slug: string;
    };
  } | null;
};

export type ValidatedExamContent = {
  readonly id: string;
  readonly title: string;
  readonly durationMinutes: number;
  readonly subject: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly source: string | null;
  readonly year: number | null;
  readonly statusLabel: string;
  readonly questions: readonly QuestionInput[];
};

const expectedQuestionTypeBySection: Readonly<
  Record<1 | 2 | 3, QuestionInput['type']>
> = {
  1: 'single_choice',
  2: 'true_false_group',
  3: 'short_answer',
};

export class ExamContentNotV2Error extends Error {
  constructor(examId: string) {
    super(`Exam ${examId} does not provide V2 content`);
    this.name = 'ExamContentNotV2Error';
  }
}

export class ExamContentIntegrityError extends Error {
  readonly issues: readonly string[];

  constructor(examId: string, issues: readonly string[]) {
    super(`Exam ${examId} contains invalid V2 content`);
    this.name = 'ExamContentIntegrityError';
    this.issues = issues;
  }
}

function validatePersistedQuestion(
  record: PersistedV2QuestionRecord,
  issues: string[],
): QuestionInput | null {
  const path = `questions[externalId=${record.externalId ?? 'missing'}]`;

  if (record.externalId === null) {
    issues.push(`${path} is missing externalId`);
    return null;
  }

  if (record.topic === null) {
    issues.push(`${path} is missing topic`);
  }

  if (
    record.subtopic !== null &&
    record.topic !== null &&
    record.subtopic.topic.slug !== record.topic.slug
  ) {
    issues.push(`${path} subtopic does not belong to its topic`);
  }

  const rawQuestion = {
    id: record.externalId,
    type: record.type,
    section: record.section,
    order: record.order,
    content: record.question,
    topicSlug: record.topic?.slug,
    ...(record.subtopic === null
      ? {}
      : { subtopicSlug: record.subtopic.slug }),
    ...(record.assets === null ? {} : { assets: record.assets }),
    ...(record.choices === null ? {} : { choices: record.choices }),
    ...(record.statements === null ? {} : { statements: record.statements }),
    ...(record.answerKey === null ? {} : { answerKey: record.answerKey }),
  };

  const result = validateQuestionInput(rawQuestion);

  if (!result.ok) {
    issues.push(`${path} ${result.message}`);
    return null;
  }

  return result.value;
}

export function validateV2ExamQuestionSet(
  questions: readonly QuestionInput[],
  issues: string[],
): void {
  const questionIds = new Set<string>();
  const orders = new Set<number>();

  for (const question of questions) {
    if (questionIds.has(question.id)) {
      issues.push(`questions contains duplicate externalId: ${question.id}`);
    }

    questionIds.add(question.id);

    if (orders.has(question.order)) {
      issues.push(`questions contains duplicate order: ${question.order}`);
    }

    orders.add(question.order);

    if (question.type !== expectedQuestionTypeBySection[question.section]) {
      issues.push(
        `question ${question.id} type ${question.type} is invalid for section ${question.section}`,
      );
    }
  }
}

function toPublicQuestion(question: QuestionInput): PublicQuestion {
  switch (question.type) {
    case 'single_choice': {
      const { answerKey: _answerKey, ...publicQuestion } = question;
      return publicQuestion;
    }

    case 'true_false_group': {
      const { answerKey: _answerKey, ...publicQuestion } = question;
      return publicQuestion;
    }

    case 'short_answer': {
      const { answerKey: _answerKey, ...publicQuestion } = question;
      return publicQuestion;
    }
  }
}

export async function getValidatedExamContentById(
  examId: string,
): Promise<ValidatedExamContent | null> {
  const exam = await prisma.exam.findUnique({
    where: {
      id: examId,
    },
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      subject: true,
      difficulty: true,
      source: true,
      year: true,
      statusLabel: true,
      questions: {
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          externalId: true,
          type: true,
          section: true,
          order: true,
          question: true,
          assets: true,
          choices: true,
          statements: true,
          answerKey: true,
          topic: {
            select: {
              slug: true,
            },
          },
          subtopic: {
            select: {
              slug: true,
              topic: {
                select: {
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (exam === null) {
    return null;
  }

  if (
    exam.questions.length === 0 ||
    exam.questions.every((question) => question.externalId === null)
  ) {
    throw new ExamContentNotV2Error(exam.id);
  }

  const issues: string[] = [];
  const questions: QuestionInput[] = [];

  for (const record of exam.questions) {
    const question = validatePersistedQuestion(record, issues);

    if (question !== null) {
      questions.push(question);
    }
  }

  validateV2ExamQuestionSet(questions, issues);

  if (issues.length > 0) {
    throw new ExamContentIntegrityError(exam.id, issues);
  }

  return {
    id: exam.id,
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    subject: exam.subject,
    difficulty: exam.difficulty,
    source: exam.source,
    year: exam.year,
    statusLabel: exam.statusLabel,
    questions,
  };
}

export async function getPublicExamContentById(
  examId: string,
): Promise<PublicExamContentDto | null> {
  const validatedExam = await getValidatedExamContentById(examId);

  if (validatedExam === null) {
    return null;
  }

  return {
    id: validatedExam.id,
    title: validatedExam.title,
    durationMinutes: validatedExam.durationMinutes,
    subject: validatedExam.subject,
    difficulty: validatedExam.difficulty,
    source: validatedExam.source,
    year: validatedExam.year,
    statusLabel: validatedExam.statusLabel,
    questions: validatedExam.questions.map(toPublicQuestion),
  };
}