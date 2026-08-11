import { prisma } from '../lib/prisma';
import type { QuestionInput } from '../types/examContent';
import { validateQuestionInput } from '../types/examContentValidation';
import { validateV2ExamQuestionSet } from './examContentReadService';
import { validateExamPublishReadiness } from './examPublishReadinessService';

export class ExamVersionPublishError extends Error {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[] = []) {
    super(message);
    this.issues = issues;
  }
}

function readVersionQuestions(value: readonly {
  externalId: string;
  type: 'single_choice' | 'true_false_group' | 'short_answer';
  section: number;
  order: number;
  content: string;
  topicSlug: string;
  subtopicSlug: string | null;
  assets: unknown;
  choices: unknown;
  statements: unknown;
  answerKey: unknown;
}[]): QuestionInput[] {
  const issues: string[] = [];
  const questions: QuestionInput[] = [];
  for (const [index, record] of value.entries()) {
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
      issues.push(`questions[${index}] ${result.message}`);
      continue;
    }
    questions.push(result.value);
  }
  validateV2ExamQuestionSet(questions, issues);
  if (issues.length > 0) throw new ExamVersionPublishError('Draft version is invalid', issues);
  return questions;
}

/** Publishes the current draft after readiness validation; published content is never edited. */
export async function publishDraftExamVersion(examId: string): Promise<{ versionId: string; versionNumber: number }> {
  return prisma.$transaction(async (tx) => {
    const draft = await tx.examVersion.findFirst({
      where: { examId, status: 'draft' },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        publishProfile: true,
        durationMinutes: true,
        scoringPolicy: true,
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
    if (draft === null) throw new ExamVersionPublishError(`Exam ${examId} has no draft version`);

    const questions = readVersionQuestions(draft.questions);
    const readiness = validateExamPublishReadiness({
      publishProfile: draft.publishProfile,
      durationMinutes: draft.durationMinutes,
      scoringPolicyId: draft.scoringPolicy,
      questions,
    });
    if (!readiness.ok) throw new ExamVersionPublishError('Draft version is not publish-ready', readiness.issues);

    await tx.examVersion.updateMany({
      where: { examId, status: 'published' },
      data: { status: 'archived' },
    });
    const published = await tx.examVersion.update({
      where: { id: draft.id },
      data: { status: 'published', publishedAt: new Date() },
      select: { id: true, versionNumber: true },
    });
    return { versionId: published.id, versionNumber: published.versionNumber };
  });
}
