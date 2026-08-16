import { Prisma } from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '../lib/prisma';
import {
  gradeValidatedExamContent,
} from './examContentGradingService';
import {
  getValidatedExamContentById,
  type ValidatedExamContent,
} from './examContentReadService';
import type {
  ChoiceId,
  ScoreUnits,
  QuestionInput,
  StatementId,
  SubmittedResponse,
} from '../types/examContent';
import type {
  CreateExamContentAttemptResponseDto,
  ExamContentAttemptAnswerReceiptDto,
  ExamContentAttemptReceiptDto,
  ExamContentAttemptReviewDto,
  ExamContentAttemptReviewQuestionDto,
} from '../types/examContentApi';
import {
  vietnamThptMath2025Scoring,
} from './examGrading';
import type {
  ExamContentSnapshotV1,
} from '../types/examContentSnapshot';
import {
  validateExamContentSnapshotV1,
} from '../types/examContentSnapshotValidation';


export class ExamContentAttemptRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExamContentAttemptRequestError';
  }
}

export class ExamContentAttemptIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExamContentAttemptIntegrityError';
  }
}

export class ExamContentAttemptNotV2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExamContentAttemptNotV2Error';
  }
}

export class ExamContentAttemptReviewUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExamContentAttemptReviewUnavailableError';
  }
}

function readDurationSeconds(rawPayload: unknown): number | null {
  if (
    typeof rawPayload !== 'object' ||
    rawPayload === null ||
    Array.isArray(rawPayload)
  ) {
    return null;
  }

  const value = (rawPayload as Record<string, unknown>).durationSeconds;

  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new ExamContentAttemptRequestError(
      'durationSeconds must be a non-negative integer',
    );
  }

  return value;
}

const ANONYMOUS_RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashAnonymousReceiptToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createAnonymousReceiptCredential(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    hash: hashAnonymousReceiptToken(token),
    expiresAt: new Date(Date.now() + ANONYMOUS_RECEIPT_TTL_MS),
  };
}

function hasMatchingAnonymousReceiptToken(expectedHash: string, rawToken: string): boolean {
  const actualHash = hashAnonymousReceiptToken(rawToken);
  return expectedHash.length === actualHash.length && timingSafeEqual(
    Buffer.from(expectedHash, 'utf8'),
    Buffer.from(actualHash, 'utf8'),
  );
}

function readRequiredExamVersionId(rawPayload: unknown): string {
  if (!isRecord(rawPayload)) {
    throw new ExamContentAttemptRequestError('Attempt payload must be an object');
  }

  const examVersionId = rawPayload.examVersionId;
  if (typeof examVersionId !== 'string' || examVersionId.trim().length === 0) {
    throw new ExamContentAttemptRequestError('examVersionId must be a non-empty string');
  }

  return examVersionId.trim();
}

function getMaximumScoreUnits(
  question: QuestionInput,
): ScoreUnits {
  switch (question.type) {
    case 'single_choice':
      return vietnamThptMath2025Scoring.singleChoiceCorrect;

    case 'true_false_group':
      return vietnamThptMath2025Scoring
        .trueFalseByCorrectStatementCount[4];

    case 'short_answer':
      return vietnamThptMath2025Scoring.shortAnswerCorrect;
  }
}

function toDisplayScore(scoreUnits: ScoreUnits): number {
  return scoreUnits / 100;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toScoreUnits(value: number): ScoreUnits {
  return value as ScoreUnits;
}

function readPersistedResponse(
  value: unknown,
  questionType: QuestionInput['type'],
): SubmittedResponse {
  if (!isRecord(value) || value.type !== questionType) {
    throw new ExamContentAttemptIntegrityError(
      'Persisted V2 attempt response has an invalid type',
    );
  }

  switch (questionType) {
    case 'single_choice':
      if (typeof value.choiceId !== 'string' || value.choiceId.trim().length === 0) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted single-choice response is invalid',
        );
      }
      return { type: 'single_choice', choiceId: value.choiceId as ChoiceId };

    case 'true_false_group': {
      if (!isRecord(value.values) || Object.keys(value.values).length !== 4) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted true/false response is invalid',
        );
      }

      const values = {} as Record<StatementId, boolean>;
      for (const [statementId, statementValue] of Object.entries(value.values)) {
        if (statementId.trim().length === 0 || typeof statementValue !== 'boolean') {
          throw new ExamContentAttemptIntegrityError(
            'Persisted true/false response contains an invalid statement',
          );
        }
        values[statementId as StatementId] = statementValue;
      }
      return { type: 'true_false_group', values };
    }

    case 'short_answer':
      if (typeof value.response !== 'string' || value.response.length === 0) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted short-answer response is invalid',
        );
      }
      return {
        type: 'short_answer',
        response: value.response as Extract<SubmittedResponse, { type: 'short_answer' }>['response'],
      };
  }
}

function readPersistedExamContentSnapshot(
  attemptExamId: string,
  totalQuestions: number,
  snapshotVersion: number | null,
  rawSnapshot: unknown,
): ExamContentSnapshotV1 | null {
  if (snapshotVersion === null && rawSnapshot === null) {
    // V2 attempt được tạo trước milestone snapshot.
    return null;
  }

  if (snapshotVersion !== 1 || rawSnapshot === null) {
    throw new ExamContentAttemptIntegrityError(
      'Persisted V2 attempt snapshot is incomplete or unsupported',
    );
  }

  const snapshotResult = validateExamContentSnapshotV1(rawSnapshot);

  if (!snapshotResult.ok) {
    throw new ExamContentAttemptIntegrityError(
      `Persisted V2 attempt snapshot is invalid: ${snapshotResult.message}`,
    );
  }

  const snapshot = snapshotResult.value;

  if (snapshot.exam.id !== attemptExamId) {
    throw new ExamContentAttemptIntegrityError(
      'Persisted V2 attempt snapshot belongs to another exam',
    );
  }

  if (snapshot.questions.length !== totalQuestions) {
    throw new ExamContentAttemptIntegrityError(
      'Persisted V2 attempt snapshot question count does not match attempt',
    );
  }

  return snapshot;
}

function calculateMaximumScoreUnits(
  questions: readonly QuestionInput[],
): ScoreUnits {
  return questions.reduce(
    (total, question) => total + getMaximumScoreUnits(question),
    0,
  ) as ScoreUnits;
}

export async function createExamContentAttempt(
  examId: string,
  rawPayload: unknown,
  userId?: string,
): Promise<CreateExamContentAttemptResponseDto | null> {
  const durationSeconds = readDurationSeconds(rawPayload);
  const examVersionId = readRequiredExamVersionId(rawPayload);
  const exam = await getValidatedExamContentById(examId, examVersionId);

  if (exam === null) {
    return null;
  }

  const grading = gradeValidatedExamContent(exam, rawPayload);
  const anonymousCredential = userId === undefined
    ? createAnonymousReceiptCredential()
    : null;
  const maximumScoreUnits = calculateMaximumScoreUnits(exam.questions);
  const examContentSnapshot = buildExamContentSnapshotV1(exam);
  const gradingResultByQuestionId = new Map(
    grading.results.map((result) => [result.questionId, result]),
  );

  return prisma.$transaction(async (tx) => {
    const versionQuestions = await tx.examVersionQuestion.findMany({
      where: {
        examVersionId: exam.versionId,
        externalId: { in: exam.questions.map((question) => question.id) },
      },
      select: {
        id: true,
        externalId: true,
      },
    });
    const versionQuestionIdByExternalId = new Map<string, string>();

    for (const versionQuestion of versionQuestions) {
      if (versionQuestionIdByExternalId.has(versionQuestion.externalId)) {
        throw new ExamContentAttemptIntegrityError(
          `Exam version ${exam.versionId} has duplicate question external ID ${versionQuestion.externalId}`,
        );
      }
      versionQuestionIdByExternalId.set(
        versionQuestion.externalId,
        versionQuestion.id,
      );
    }

    if (versionQuestionIdByExternalId.size !== exam.questions.length) {
      throw new ExamContentAttemptIntegrityError(
        `Exam version ${exam.versionId} does not contain every validated question`,
      );
    }

    const attempt = await tx.attempt.create({
      data: {
        examId: exam.id,
        examVersionId: exam.versionId,
        userId: userId ?? null,
        score: toDisplayScore(grading.totalAwardedScore),
        scoringPolicy: 'vietnam_thpt_math_2025',
        scoreUnits: grading.totalAwardedScore,
        maxScoreUnits: maximumScoreUnits,
        contentSnapshotVersion: examContentSnapshot.version,
        examContentSnapshot: toJsonValue(examContentSnapshot),
        correctCount: grading.results.filter((result) => result.isCorrect).length,
        totalQuestions: exam.questions.length,
        unansweredCount: grading.results.filter(
          (result) => result.response === undefined,
        ).length,
        durationSeconds,
        anonymousReceiptTokenHash: anonymousCredential?.hash ?? null,
        anonymousReceiptExpiresAt: anonymousCredential?.expiresAt ?? null,
        answers: {
          create: exam.questions.map((question) => {
            const gradingResult = gradingResultByQuestionId.get(question.id);

            if (gradingResult === undefined) {
              throw new ExamContentAttemptIntegrityError(
                `Question ${question.id} cannot be persisted for this attempt`,
              );
            }

            const examVersionQuestionId = versionQuestionIdByExternalId.get(question.id);
            if (examVersionQuestionId === undefined) {
              throw new ExamContentAttemptIntegrityError(
                `Question ${question.id} has no canonical V2 reference in version ${exam.versionId}`,
              );
            }

            return {
              isCorrect: gradingResult.isCorrect,
              questionExternalId: question.id,
              examVersionQuestionId,
              questionType: question.type,
              response:
                gradingResult.response === undefined
                  ? Prisma.DbNull
                  : toJsonValue(gradingResult.response),
              awardedScoreUnits: gradingResult.awardedScore,
              maxScoreUnits: getMaximumScoreUnits(question),
              isFullyCorrect: gradingResult.isCorrect,
            };
          }),
        },
      },
      select: {
        id: true,
        submittedAt: true,
      },
    });

    return {
      attemptId: attempt.id,
      examId: exam.id,
      examVersionId: exam.versionId,
      scoringPolicyId: grading.scoringPolicyId,
      scoreUnits: grading.totalAwardedScore,
      maxScoreUnits: maximumScoreUnits,
      correctCount: grading.results.filter((result) => result.isCorrect).length,
      totalQuestions: exam.questions.length,
      unansweredCount: grading.results.filter(
        (result) => result.response === undefined,
      ).length,
      durationSeconds,
      submittedAt: attempt.submittedAt.toISOString(),
      results: grading.results,
      ...(anonymousCredential === null ? {} : { anonymousReceiptToken: anonymousCredential.token }),
    };
  });
}

function buildExamContentSnapshotV1(
  exam: ValidatedExamContent,
): ExamContentSnapshotV1 {
  const candidate: ExamContentSnapshotV1 = {
    version: 1,
    exam: {
      id: exam.id,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      subject: exam.subject,
      scoringPolicyId: vietnamThptMath2025Scoring.id,
    },
    questions: exam.questions,
  };

  const result = validateExamContentSnapshotV1(candidate);

  if (!result.ok) {
    throw new ExamContentAttemptIntegrityError(
      `Cannot create valid exam content snapshot: ${result.message}`,
    );
  }

  return result.value;
}

/**
 * Reads only an authenticated owner's V2 receipt. A missing result intentionally
 * covers absent attempts, another user's attempt, and anonymous attempts.
 */
export async function getExamContentAttemptReceiptById(
  attemptId: string,
  userId?: string,
  anonymousReceiptToken?: string,
): Promise<ExamContentAttemptReceiptDto | null> {
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
    },
    select: {
      id: true,
      examId: true,
      examVersionId: true,
      userId: true,
      anonymousReceiptTokenHash: true,
      anonymousReceiptExpiresAt: true,
      submittedAt: true,
      durationSeconds: true,
      scoringPolicy: true,
      scoreUnits: true,
      maxScoreUnits: true,
      contentSnapshotVersion: true,
      examContentSnapshot: true,
      totalQuestions: true,
      unansweredCount: true,
      answers: {
        orderBy: { questionExternalId: 'asc' },
        select: {
          questionExternalId: true,
          examVersionQuestionId: true,
          questionType: true,
          response: true,
          awardedScoreUnits: true,
          maxScoreUnits: true,
          isFullyCorrect: true,
          examVersionQuestion: {
            select: {
              examVersionId: true,
              externalId: true,
            },
          },
        },
      },
    },
  });

  if (attempt === null) {
    return null;
  }

  if (userId !== undefined) {
    if (attempt.userId !== userId) return null;
  } else if (
    attempt.userId !== null ||
    anonymousReceiptToken === undefined ||
    attempt.anonymousReceiptTokenHash === null ||
    attempt.anonymousReceiptExpiresAt === null ||
    attempt.anonymousReceiptExpiresAt <= new Date() ||
    !hasMatchingAnonymousReceiptToken(attempt.anonymousReceiptTokenHash, anonymousReceiptToken)
  ) {
    return null;
  }

  if (
    attempt.scoringPolicy !== 'vietnam_thpt_math_2025' ||
    attempt.scoreUnits === null ||
    attempt.maxScoreUnits === null
  ) {
    throw new ExamContentAttemptNotV2Error('Attempt is not a V2 attempt');
  }

  const snapshot = readPersistedExamContentSnapshot(
    attempt.examId,
    attempt.totalQuestions,
    attempt.contentSnapshotVersion,
    attempt.examContentSnapshot,
  );
  const snapshotQuestionByExternalId = snapshot === null
    ? null
    : new Map<string, QuestionInput>(
      snapshot.questions.map((question) => [question.id, question]),
    );

  const answers: ExamContentAttemptAnswerReceiptDto[] = attempt.answers.map(
    (answer) => {
      if (
        answer.questionExternalId === null ||
        answer.examVersionQuestionId === null ||
        answer.examVersionQuestion === null ||
        answer.questionType === null ||
        answer.awardedScoreUnits === null ||
        answer.maxScoreUnits === null ||
        answer.isFullyCorrect === null
      ) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted V2 attempt answer is incomplete',
        );
      }

      if (
        attempt.examVersionId === null ||
        answer.examVersionQuestion.examVersionId !== attempt.examVersionId ||
        answer.examVersionQuestion.externalId !== answer.questionExternalId
      ) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted V2 attempt answer does not match its canonical question reference',
        );
      }

      if (snapshotQuestionByExternalId !== null) {
        const snapshotQuestion = snapshotQuestionByExternalId.get(
          answer.questionExternalId,
        );

        if (
          snapshotQuestion === undefined ||
          snapshotQuestion.type !== answer.questionType
        ) {
          throw new ExamContentAttemptIntegrityError(
            'Persisted V2 attempt answer does not match its snapshot',
          );
        }
      }

      return {
        questionExternalId: answer.questionExternalId,
        questionType: answer.questionType,
        response:
          answer.response === null
            ? null
            : readPersistedResponse(answer.response, answer.questionType),
        awardedScoreUnits: toScoreUnits(answer.awardedScoreUnits),
        maxScoreUnits: toScoreUnits(answer.maxScoreUnits),
        isFullyCorrect: answer.isFullyCorrect,
      };
    },
  );

  if (answers.length !== attempt.totalQuestions) {
    throw new ExamContentAttemptIntegrityError(
      'Persisted V2 attempt does not contain every exam question',
    );
  }

  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    examVersionId: attempt.examVersionId,
    submittedAt: attempt.submittedAt.toISOString(),
    durationSeconds: attempt.durationSeconds,
    scoringPolicyId: 'vietnam_thpt_math_2025',
    scoreUnits: toScoreUnits(attempt.scoreUnits),
    maxScoreUnits: toScoreUnits(attempt.maxScoreUnits),
    totalQuestions: attempt.totalQuestions,
    unansweredCount: attempt.unansweredCount,
    answers,
  };
}

/** Anonymous access is limited to the same safe receipt, never review. */
export async function getAnonymousExamContentAttemptReceiptById(
  attemptId: string,
  anonymousReceiptToken: string,
): Promise<ExamContentAttemptReceiptDto | null> {
  return getExamContentAttemptReceiptById(attemptId, undefined, anonymousReceiptToken);
}

function toAttemptReviewQuestion(
  question: QuestionInput,
  answer: ExamContentAttemptAnswerReceiptDto,
): ExamContentAttemptReviewQuestionDto {
  const outcome = {
    studentResponse: answer.response,
    awardedScoreUnits: answer.awardedScoreUnits,
    maxScoreUnits: answer.maxScoreUnits,
    isFullyCorrect: answer.isFullyCorrect,
  };

  switch (question.type) {
    case 'single_choice': {
      const { answerKey, ...publicQuestion } = question;
      return {
        ...publicQuestion,
        ...outcome,
        correctAnswer: {
          type: 'single_choice',
          correctChoiceId: answerKey.correctChoiceId,
        },
      };
    }

    case 'true_false_group': {
      const { answerKey, ...publicQuestion } = question;
      return {
        ...publicQuestion,
        ...outcome,
        correctAnswer: {
          type: 'true_false_group',
          values: answerKey.values,
        },
      };
    }

    case 'short_answer': {
      const { answerKey, ...publicQuestion } = question;
      return {
        ...publicQuestion,
        ...outcome,
        correctAnswer: {
          type: 'short_answer',
          mode: answerKey.mode,
          answer: answerKey.answer,
          ...(answerKey.mode === 'numeric_with_tolerance'
            ? { tolerance: answerKey.tolerance }
            : {}),
        },
      };
    }
  }
}

/** Owner-only review model. Correct answers come from the attempt snapshot. */
export async function getExamContentAttemptReviewById(
  attemptId: string,
  userId: string,
): Promise<ExamContentAttemptReviewDto | null> {
  const receipt = await getExamContentAttemptReceiptById(attemptId, userId);

  if (receipt === null) {
    return null;
  }

  const snapshotRecord = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      examId: true,
      totalQuestions: true,
      contentSnapshotVersion: true,
      examContentSnapshot: true,
    },
  });

  if (snapshotRecord === null) {
    return null;
  }

  const snapshot = readPersistedExamContentSnapshot(
    snapshotRecord.examId,
    snapshotRecord.totalQuestions,
    snapshotRecord.contentSnapshotVersion,
    snapshotRecord.examContentSnapshot,
  );

  if (snapshot === null) {
    throw new ExamContentAttemptReviewUnavailableError(
      'Attempt was created before exam snapshots were available',
    );
  }

  const answerByQuestionId = new Map(
    receipt.answers.map((answer) => [answer.questionExternalId, answer]),
  );
  const questions = snapshot.questions.map((question) => {
    const answer = answerByQuestionId.get(question.id);

    if (answer === undefined || answer.questionType !== question.type) {
      throw new ExamContentAttemptIntegrityError(
        'Persisted V2 attempt review data does not match its snapshot',
      );
    }

    return toAttemptReviewQuestion(question, answer);
  });

  return {
    attemptId: receipt.attemptId,
    examId: receipt.examId,
    submittedAt: receipt.submittedAt,
    durationSeconds: receipt.durationSeconds,
    scoringPolicyId: receipt.scoringPolicyId,
    scoreUnits: receipt.scoreUnits,
    maxScoreUnits: receipt.maxScoreUnits,
    totalQuestions: receipt.totalQuestions,
    unansweredCount: receipt.unansweredCount,
    questions,
  };
}
