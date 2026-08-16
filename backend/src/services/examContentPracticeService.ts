import { prisma } from '../lib/prisma';
import type { QuestionId, QuestionInput, RawSubmittedResponse } from '../types/examContent';
import type {
  GradePracticeResponseDto,
  PracticeQuestionReferenceDto,
  PublicPracticeQuestionDto,
  PublicPracticeTopicDto,
} from '../types/examContentApi';
import { isRecord } from '../types/examContentValidation';
import { maximumQuestionScore } from './examGrading';
import {
  ExamContentIntegrityError,
  getValidatedExamContentById,
  toPublicQuestion,
} from './examContentReadService';
import {
  ExamContentGradeRequestError,
  gradeQuestionSet,
} from './examContentGradingService';

const DEFAULT_PRACTICE_LIMIT = 10;
const MAX_PRACTICE_LIMIT = 50;

export class PracticeRequestError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super('Practice request is invalid');
    this.name = 'PracticeRequestError';
    this.issues = issues;
  }
}

type PracticeQuestion = {
  readonly reference: PracticeQuestionReferenceDto;
  readonly question: QuestionInput;
};

function practiceQuestionId(reference: PracticeQuestionReferenceDto): QuestionId {
  return `${reference.examVersionId}:${reference.questionId}` as QuestionId;
}

function withPracticeQuestionId(
  question: QuestionInput,
  reference: PracticeQuestionReferenceDto,
): QuestionInput {
  return { ...question, id: practiceQuestionId(reference) } as QuestionInput;
}

function parseTopicSlug(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PracticeRequestError(['topicSlug must be a non-empty string']);
  }
  return value.trim();
}

function parseReferences(value: unknown): readonly PracticeQuestionReferenceDto[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PracticeRequestError(['questionRefs must be a non-empty array']);
  }

  const issues: string[] = [];
  const references: PracticeQuestionReferenceDto[] = [];
  const seen = new Set<string>();

  for (const [index, valueAtIndex] of value.entries()) {
    const path = `questionRefs[${index}]`;
    if (!isRecord(valueAtIndex)) {
      issues.push(`${path} must be an object`);
      continue;
    }
    const { examVersionId, questionId } = valueAtIndex;
    if (typeof examVersionId !== 'string' || examVersionId.trim().length === 0) {
      issues.push(`${path}.examVersionId must be a non-empty string`);
      continue;
    }
    if (typeof questionId !== 'string' || questionId.trim().length === 0) {
      issues.push(`${path}.questionId must be a non-empty string`);
      continue;
    }
    const reference = { examVersionId: examVersionId.trim(), questionId: questionId.trim() };
    const key = `${reference.examVersionId}\u0000${reference.questionId}`;
    if (seen.has(key)) {
      issues.push(`${path} is duplicated`);
      continue;
    }
    seen.add(key);
    references.push(reference);
  }

  if (issues.length > 0) throw new PracticeRequestError(issues);
  return references;
}

function readGradeInput(rawPayload: unknown): {
  readonly topicSlug: string;
  readonly references: readonly PracticeQuestionReferenceDto[];
  readonly responses: readonly RawSubmittedResponse[];
} {
  if (!isRecord(rawPayload)) {
    throw new PracticeRequestError(['Request body must be an object']);
  }
  if (!Array.isArray(rawPayload.responses)) {
    throw new PracticeRequestError(['responses must be an array']);
  }
  return {
    topicSlug: parseTopicSlug(rawPayload.topicSlug),
    references: parseReferences(rawPayload.questionRefs),
    responses: rawPayload.responses as readonly RawSubmittedResponse[],
  };
}

async function loadPracticeQuestions(
  topicSlug: string,
  references: readonly PracticeQuestionReferenceDto[],
): Promise<readonly PracticeQuestion[]> {
  const publishedMatches = await prisma.examVersionQuestion.findMany({
    where: {
      topicSlug,
      OR: references.map((reference) => ({
        examVersionId: reference.examVersionId,
        externalId: reference.questionId,
      })),
      examVersion: {
        status: 'published',
      },
    },
    select: {
      examVersionId: true,
      externalId: true,
      examVersion: { select: { examId: true } },
    },
  });

  if (publishedMatches.length !== references.length) {
    throw new PracticeRequestError([
      'Every practice question must belong to currently published V2 content for this topic',
    ]);
  }

  const examByVersionId = new Map(
    publishedMatches.map((match) => [match.examVersionId, match.examVersion.examId]),
  );
  const contentByVersionId = new Map<string, Awaited<ReturnType<typeof getValidatedExamContentById>>>();
  for (const [versionId, examId] of examByVersionId) {
    contentByVersionId.set(versionId, await getValidatedExamContentById(examId, versionId));
  }

  const questions: PracticeQuestion[] = [];
  for (const reference of references) {
    const content = contentByVersionId.get(reference.examVersionId);
    const question = content?.questions.find(
      (candidate) => candidate.id === reference.questionId && candidate.topicSlug === topicSlug,
    );
    if (question === undefined) {
      throw new PracticeRequestError(['A practice question is no longer available']);
    }
    questions.push({ reference, question: withPracticeQuestionId(question, reference) });
  }
  return questions;
}

function toPublicPracticeQuestion(item: PracticeQuestion): PublicPracticeQuestionDto {
  return {
    ...toPublicQuestion(item.question),
    reference: item.reference,
  };
}

export async function getPracticeByTopicSlugV2(
  topicSlug: string,
  requestedLimit?: number,
): Promise<PublicPracticeTopicDto | null> {
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
    select: { slug: true, name: true },
  });
  if (topic === null) return null;

  const limit = Math.min(Math.max(requestedLimit ?? DEFAULT_PRACTICE_LIMIT, 1), MAX_PRACTICE_LIMIT);
  const candidates = await prisma.examVersionQuestion.findMany({
    where: {
      topicSlug,
      examVersion: { status: 'published' },
    },
    orderBy: [{ examVersionId: 'asc' }, { order: 'asc' }],
    take: limit,
    select: {
      examVersionId: true,
      externalId: true,
    },
  });

  const questions = await loadPracticeQuestions(
    topicSlug,
    candidates.map((candidate) => ({
      examVersionId: candidate.examVersionId,
      questionId: candidate.externalId,
    })),
  );
  return { topic, questions: questions.map(toPublicPracticeQuestion) };
}

export async function gradePracticeV2(rawPayload: unknown): Promise<GradePracticeResponseDto> {
  const input = readGradeInput(rawPayload);
  const questions = await loadPracticeQuestions(input.topicSlug, input.references);
  const grading = gradeQuestionSet(
    questions.map((item) => item.question),
    { responses: input.responses },
  );
  const maximumByQuestionId = new Map(
    questions.map((item) => [item.question.id, maximumQuestionScore(item.question)]),
  );
  const results = grading.results.map((result) => ({
    questionId: result.questionId,
    response: result.response ?? null,
    isCorrect: result.isCorrect,
    awardedScoreUnits: result.awardedScore,
    maxScoreUnits: maximumByQuestionId.get(result.questionId)!,
  }));
  const scoreUnits = grading.totalAwardedScore;
  const maxScoreUnits = results.reduce((total, result) => total + result.maxScoreUnits, 0) as typeof scoreUnits;

  return {
    scoringPolicyId: grading.scoringPolicyId,
    scoreUnits,
    maxScoreUnits,
    correctCount: results.filter((result) => result.isCorrect).length,
    totalQuestions: results.length,
    unansweredCount: results.filter((result) => result.response === null).length,
    results,
  };
}

export { ExamContentGradeRequestError, ExamContentIntegrityError };
