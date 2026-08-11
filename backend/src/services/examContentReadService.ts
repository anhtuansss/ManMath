import type { Prisma, QuestionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { PublicQuestion, QuestionInput } from '../types/examContent';
import type { PublicExamContentDto } from '../types/examContentApi';
import { validateQuestionInput } from '../types/examContentValidation';

type PersistedVersionQuestionRecord = {
  readonly externalId: string;
  readonly type: QuestionType;
  readonly section: number;
  readonly order: number;
  readonly content: string;
  readonly topicSlug: string;
  readonly subtopicSlug: string | null;
  readonly assets: Prisma.JsonValue | null;
  readonly choices: Prisma.JsonValue | null;
  readonly statements: Prisma.JsonValue | null;
  readonly answerKey: Prisma.JsonValue;
};

export type ValidatedExamContent = {
  readonly id: string;
  readonly versionId: string;
  readonly versionNumber: number;
  readonly publishProfile: 'official_full_exam' | 'practice';
  readonly title: string;
  readonly durationMinutes: number;
  readonly subject: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly source: string | null;
  readonly year: number | null;
  readonly statusLabel: string;
  readonly questions: readonly QuestionInput[];
};

const expectedQuestionTypeBySection: Readonly<Record<1 | 2 | 3, QuestionInput['type']>> = {
  1: 'single_choice',
  2: 'true_false_group',
  3: 'short_answer',
};

export class ExamContentNotV2Error extends Error {
  constructor(examId: string) {
    super(`Exam ${examId} does not provide a published V2 version`);
  }
}

export class ExamContentIntegrityError extends Error {
  readonly issues: readonly string[];

  constructor(examId: string, issues: readonly string[]) {
    super(`Exam ${examId} contains invalid V2 content`);
    this.issues = issues;
  }
}

function validatePersistedVersionQuestion(
  record: PersistedVersionQuestionRecord,
  issues: string[],
): QuestionInput | null {
  const path = `questions[externalId=${record.externalId}]`;
  const result = validateQuestionInput({
    id: record.externalId,
    type: record.type,
    section: record.section,
    order: record.order,
    content: record.content,
    topicSlug: record.topicSlug,
    ...(record.subtopicSlug === null ? {} : { subtopicSlug: record.subtopicSlug }),
    ...(record.assets === null ? {} : { assets: record.assets }),
    ...(record.choices === null ? {} : { choices: record.choices }),
    ...(record.statements === null ? {} : { statements: record.statements }),
    answerKey: record.answerKey,
  });

  if (!result.ok) {
    issues.push(`${path} ${result.message}`);
    return null;
  }

  return result.value;
}

export function validateV2ExamQuestionSet(questions: readonly QuestionInput[], issues: string[]): void {
  const questionIds = new Set<string>();
  const orders = new Set<number>();

  for (const question of questions) {
    if (questionIds.has(question.id)) issues.push(`questions contains duplicate externalId: ${question.id}`);
    questionIds.add(question.id);
    if (orders.has(question.order)) issues.push(`questions contains duplicate order: ${question.order}`);
    orders.add(question.order);
    if (question.type !== expectedQuestionTypeBySection[question.section]) {
      issues.push(`question ${question.id} type ${question.type} is invalid for section ${question.section}`);
    }
  }
}

export async function getValidatedExamContentById(
  examId: string,
  requestedVersionId?: string,
): Promise<ValidatedExamContent | null> {
  const version = await prisma.examVersion.findFirst({
    where: {
      examId,
      status: 'published',
      ...(requestedVersionId === undefined ? {} : { id: requestedVersionId }),
    },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      examId: true,
      versionNumber: true,
      publishProfile: true,
      title: true,
      durationMinutes: true,
      subject: true,
      difficulty: true,
      source: true,
      year: true,
      statusLabel: true,
      questions: {
        orderBy: { order: 'asc' },
        select: {
          externalId: true,
          type: true,
          section: true,
          order: true,
          content: true,
          topicSlug: true,
          subtopicSlug: true,
          assets: true,
          choices: true,
          statements: true,
          answerKey: true,
        },
      },
    },
  });

  if (version === null) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, contentEngine: true },
    });
    if (exam === null) return null;
    throw new ExamContentNotV2Error(examId);
  }

  const issues: string[] = [];
  const questions: QuestionInput[] = [];
  for (const record of version.questions) {
    const question = validatePersistedVersionQuestion(record, issues);
    if (question !== null) questions.push(question);
  }
  validateV2ExamQuestionSet(questions, issues);
  if (issues.length > 0) throw new ExamContentIntegrityError(examId, issues);

  return {
    id: version.examId,
    versionId: version.id,
    versionNumber: version.versionNumber,
    publishProfile: version.publishProfile,
    title: version.title,
    durationMinutes: version.durationMinutes,
    subject: version.subject,
    difficulty: version.difficulty,
    source: version.source,
    year: version.year,
    statusLabel: version.statusLabel,
    questions,
  };
}

function toPublicQuestion(question: QuestionInput): PublicQuestion {
  const { answerKey: _answerKey, ...publicQuestion } = question;
  return publicQuestion;
}

export async function getPublicExamContentById(examId: string): Promise<PublicExamContentDto | null> {
  const validatedExam = await getValidatedExamContentById(examId);
  if (validatedExam === null) return null;
  return {
    id: validatedExam.id,
    examVersionId: validatedExam.versionId,
    versionNumber: validatedExam.versionNumber,
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
