import { gradeQuestion, vietnamThptMath2025Scoring } from './examGrading';
import { 
    getValidatedExamContentById,
    type ValidatedExamContent,
 } from './examContentReadService';
import {
  isRecord,
  parseQuestionId,
  validateSubmittedResponse,
} from '../types/examContentValidation';
import type {
  QuestionId,
  QuestionInput,
  ScoreUnits,
  SubmittedResponse,
} from '../types/examContent';
import type { GradeExamContentResponseDto } from '../types/examContentApi';

export class ExamContentGradeRequestError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super('Exam content grade request is invalid');
    this.name = 'ExamContentGradeRequestError';
    this.issues = issues;
  }
}

function toScoreUnits(value: number): ScoreUnits {
  return value as ScoreUnits;
}

function readRawResponses(
  rawPayload: unknown,
): readonly unknown[] {
  if (!isRecord(rawPayload)) {
    throw new ExamContentGradeRequestError([
      'Request body must be an object',
    ]);
  }

  if (!Array.isArray(rawPayload.responses)) {
    throw new ExamContentGradeRequestError([
      'responses must be an array',
    ]);
  }

  return rawPayload.responses;
}

function validateResponses(
  rawResponses: readonly unknown[],
  questions: readonly QuestionInput[],
): ReadonlyMap<QuestionId, SubmittedResponse> {
  const issues: string[] = [];
  const questionById = new Map<QuestionId, QuestionInput>(
    questions.map((question) => [question.id, question]),
  );
  const responsesByQuestionId = new Map<QuestionId, SubmittedResponse>();

  for (const [index, rawResponse] of rawResponses.entries()) {
    const path = `responses[${index}]`;

    if (!isRecord(rawResponse)) {
      issues.push(`${path} must be an object`);
      continue;
    }

    const questionIdResult = parseQuestionId(rawResponse.questionId);

    if (!questionIdResult.ok) {
      issues.push(`${path}.questionId ${questionIdResult.message}`);
      continue;
    }

    const questionId = questionIdResult.value;
    const question = questionById.get(questionId);

    if (question === undefined) {
      issues.push(`${path}.questionId does not belong to this exam`);
      continue;
    }

    if (responsesByQuestionId.has(questionId)) {
      issues.push(`${path}.questionId is duplicated`);
      continue;
    }

    const responseResult = validateSubmittedResponse(rawResponse, question);

    if (!responseResult.ok) {
      issues.push(`${path} ${responseResult.message}`);
      continue;
    }

    responsesByQuestionId.set(questionId, responseResult.value);
  }

  if (issues.length > 0) {
    throw new ExamContentGradeRequestError(issues);
  }

  return responsesByQuestionId;
}

export function gradeValidatedExamContent(
  exam: ValidatedExamContent,
  rawPayload: unknown,
): GradeExamContentResponseDto {
  const rawResponses = readRawResponses(rawPayload);

  const responsesByQuestionId = validateResponses(
    rawResponses,
    exam.questions,
  );

  const results = exam.questions.map((question) =>
    gradeQuestion(question, responsesByQuestionId.get(question.id)),
  );

  const totalAwardedScore = toScoreUnits(
    results.reduce(
      (total, result) => total + result.awardedScore,
      0,
    ),
  );

  return {
    scoringPolicyId: vietnamThptMath2025Scoring.id,
    totalAwardedScore,
    maxScore: vietnamThptMath2025Scoring.maximumExamScore,
    results,
  };
}

export async function gradeExamContent(
  examId: string,
  rawPayload: unknown,
): Promise<GradeExamContentResponseDto | null> {
  const exam = await getValidatedExamContentById(examId);

  if (exam === null) {
    return null;
  }

  return gradeValidatedExamContent(exam, rawPayload);
}
