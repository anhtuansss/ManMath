import { Prisma } from '@prisma/client';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { JWT_SECRET } from '../config/env';
import { prisma } from '../lib/prisma';
import {
  authorizeTimingSessionForSubmission,
  ExamTimingSessionError,
  startExamTimingSession,
} from './examTimingSessionService';
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

function readRequiredTimingSessionId(rawPayload: unknown): string {
  if (!isRecord(rawPayload)) {
    throw new ExamContentAttemptRequestError('Attempt payload must be an object');
  }

  const value = rawPayload.timingSessionId;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ExamContentAttemptRequestError('timingSessionId must be a non-empty string');
  }
  return value.trim();
}

export class ExamContentAttemptIdempotencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExamContentAttemptIdempotencyConflictError';
  }
}

const ANONYMOUS_RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashAnonymousReceiptToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createAnonymousReceiptCredential(
  idempotencyKey: string,
  expiresAt: Date,
): { token: string; hash: string; expiresAt: Date } {
  const expiresAtMs = expiresAt.getTime();
  const signedValue = `manmath:anonymous-attempt-receipt:v1:${idempotencyKey}:${expiresAtMs}`;
  const signature = createHmac('sha256', JWT_SECRET).update(signedValue).digest('base64url');
  const token = `v1.${idempotencyKey}.${expiresAtMs}.${signature}`;
  return {
    token,
    hash: hashAnonymousReceiptToken(token),
    expiresAt,
  };
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

function buildSubmissionFingerprint(input: {
  readonly identityScope: string;
  readonly examId: string;
  readonly examVersionId: string;
  readonly timingSessionId: string;
  readonly responses: readonly { readonly questionId: string; readonly response: SubmittedResponse | undefined }[];
}): string {
  return createHash('sha256').update(canonicalJson(input)).digest('hex');
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

export type ExamContentAttemptSubmissionResult = {
  readonly response: CreateExamContentAttemptResponseDto;
  readonly replayed: boolean;
};

export async function submitExamContentAttempt(
  examId: string,
  rawPayload: unknown,
  userId: string | undefined,
  anonymousTimingSessionToken: string | undefined,
  idempotencyKey: string,
  identityScope: string,
  now = new Date(),
): Promise<ExamContentAttemptSubmissionResult | null> {
  const timingSessionId = readRequiredTimingSessionId(rawPayload);
  const examVersionId = readRequiredExamVersionId(rawPayload);
  const exam = await getValidatedExamContentById(examId, examVersionId);

  if (exam === null) {
    return null;
  }

  const grading = gradeValidatedExamContent(exam, rawPayload);
  const fingerprint = buildSubmissionFingerprint({
    identityScope,
    examId: exam.id,
    examVersionId: exam.versionId,
    timingSessionId,
    responses: grading.results.map((result) => ({
      questionId: result.questionId,
      response: result.response,
    })),
  });
  const existing = await getIdempotentAttemptReplay(idempotencyKey, fingerprint);
  if (existing !== null) return existing;

  const anonymousExpiry = userId === undefined
    ? new Date(Date.now() + ANONYMOUS_RECEIPT_TTL_MS)
    : null;
  const anonymousCredential = anonymousExpiry === null
    ? null
    : createAnonymousReceiptCredential(idempotencyKey, anonymousExpiry);
  const maximumScoreUnits = calculateMaximumScoreUnits(exam.questions);
  const examContentSnapshot = buildExamContentSnapshotV1(exam);
  const gradingResultByQuestionId = new Map(
    grading.results.map((result) => [result.questionId, result]),
  );

  try {
    return await prisma.$transaction(async (tx) => {
    const timing = await authorizeTimingSessionForSubmission(tx, {
      sessionId: timingSessionId,
      examId: exam.id,
      examVersionId: exam.versionId,
      access: { userId, anonymousToken: anonymousTimingSessionToken },
      now,
    });
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
        timingSessionId,
        userId: userId ?? null,
        startedAt: timing.startedAt,
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
        durationSeconds: timing.durationSeconds,
        anonymousReceiptTokenHash: anonymousCredential?.hash ?? null,
        anonymousReceiptExpiresAt: anonymousCredential?.expiresAt ?? null,
        idempotencyKey,
        submissionFingerprint: fingerprint,
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

    await tx.examTimingSession.update({
      where: { id: timingSessionId },
      data: { status: 'submitted', submittedAt: now },
    });

    return {
      response: {
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
        durationSeconds: timing.durationSeconds,
        submittedAt: attempt.submittedAt.toISOString(),
        results: grading.results,
        ...(anonymousCredential === null ? {} : { anonymousReceiptToken: anonymousCredential.token }),
      },
      replayed: false,
    };
  });
  } catch (error) {
    if (error instanceof ExamTimingSessionError && error.code === 'expired') {
      // The transaction rolls back on expiry, so transition the session separately.
      await prisma.examTimingSession.updateMany({
        where: { id: timingSessionId, status: 'in_progress' },
        data: { status: 'expired' },
      });
      throw error;
    }
    if (!isPrismaUniqueConstraintError(error)) throw error;
    const replay = await getIdempotentAttemptReplay(idempotencyKey, fingerprint);
    if (replay === null) throw error;
    return replay;
  }
}

/** Compatibility wrapper for isolated service checks that do not exercise HTTP idempotency. */
export async function createExamContentAttempt(
  examId: string,
  rawPayload: unknown,
  userId?: string,
): Promise<CreateExamContentAttemptResponseDto | null> {
  if (!isRecord(rawPayload)) {
    throw new ExamContentAttemptRequestError('Attempt payload must be an object');
  }
  const examVersionId = readRequiredExamVersionId(rawPayload);
  const timingSession = await startExamTimingSession(examId, examVersionId, userId);
  if (timingSession === null) return null;
  const payload = { ...rawPayload, timingSessionId: timingSession.id };
  const result = await submitExamContentAttempt(
    examId,
    payload,
    userId,
    timingSession.anonymousTimingSessionToken,
    randomUUID(),
    userId === undefined ? 'anonymous:internal-verification' : `user:${userId}`,
  );
  return result?.response ?? null;
}

async function getIdempotentAttemptReplay(
  idempotencyKey: string,
  fingerprint: string,
): Promise<ExamContentAttemptSubmissionResult | null> {
  const attempt = await prisma.attempt.findUnique({
    where: { idempotencyKey },
    select: {
      id: true,
      examId: true,
      examVersionId: true,
      userId: true,
      scoreUnits: true,
      maxScoreUnits: true,
      correctCount: true,
      totalQuestions: true,
      unansweredCount: true,
      durationSeconds: true,
      submittedAt: true,
      submissionFingerprint: true,
      contentSnapshotVersion: true,
      examContentSnapshot: true,
      anonymousReceiptTokenHash: true,
      anonymousReceiptExpiresAt: true,
      answers: {
        select: {
          questionExternalId: true,
          questionType: true,
          response: true,
          isFullyCorrect: true,
          awardedScoreUnits: true,
        },
      },
    },
  });

  if (attempt === null) return null;
  if (attempt.submissionFingerprint !== fingerprint) {
    throw new ExamContentAttemptIdempotencyConflictError(
      'Idempotency key is already associated with a different submission',
    );
  }
  if (
    attempt.examVersionId === null ||
    attempt.scoreUnits === null ||
    attempt.maxScoreUnits === null ||
    attempt.durationSeconds === null
  ) {
    throw new ExamContentAttemptIntegrityError(
      'Persisted idempotent V2 attempt is incomplete',
    );
  }

  const snapshot = readPersistedExamContentSnapshot(
    attempt.examId,
    attempt.totalQuestions,
    attempt.contentSnapshotVersion,
    attempt.examContentSnapshot,
  );
  if (snapshot === null) {
    throw new ExamContentAttemptIntegrityError(
      'Persisted idempotent V2 attempt has no snapshot',
    );
  }

  const answerByQuestionId = new Map(
    attempt.answers.map((answer) => [answer.questionExternalId, answer]),
  );
  const results = snapshot.questions.map((question) => {
    const answer = answerByQuestionId.get(question.id);
    if (
      answer === undefined ||
      answer.questionType !== question.type ||
      answer.isFullyCorrect === null ||
      answer.awardedScoreUnits === null
    ) {
      throw new ExamContentAttemptIntegrityError(
        'Persisted idempotent V2 attempt answers are incomplete',
      );
    }
    return {
      questionId: question.id,
      ...(answer.response === null
        ? {}
        : { response: readPersistedResponse(answer.response, question.type) }),
      isCorrect: answer.isFullyCorrect,
      awardedScore: toScoreUnits(answer.awardedScoreUnits),
    };
  });

  const anonymousReceiptToken = attempt.userId === null
    ? (() => {
      if (
        attempt.anonymousReceiptTokenHash === null ||
        attempt.anonymousReceiptExpiresAt === null
      ) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted anonymous idempotent V2 attempt has no receipt credential',
        );
      }
      const credential = createAnonymousReceiptCredential(
        idempotencyKey,
        attempt.anonymousReceiptExpiresAt,
      );
      if (!hasMatchingAnonymousReceiptToken(attempt.anonymousReceiptTokenHash, credential.token)) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted anonymous idempotent V2 attempt receipt credential does not match',
        );
      }
      return credential.token;
    })()
    : undefined;

  return {
    response: {
      attemptId: attempt.id,
      examId: attempt.examId,
      examVersionId: attempt.examVersionId,
      scoringPolicyId: 'vietnam_thpt_math_2025',
      scoreUnits: toScoreUnits(attempt.scoreUnits),
      maxScoreUnits: toScoreUnits(attempt.maxScoreUnits),
      correctCount: attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      unansweredCount: attempt.unansweredCount,
      durationSeconds: attempt.durationSeconds,
      submittedAt: attempt.submittedAt.toISOString(),
      results,
      ...(anonymousReceiptToken === undefined ? {} : { anonymousReceiptToken }),
    },
    replayed: true,
  };
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
      examVersion: {
        select: {
          title: true,
          questions: {
            select: {
              externalId: true,
              order: true,
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
  const fallbackQuestionOrderByExternalId = new Map(
    attempt.examVersion?.questions.map((question) => [
      question.externalId,
      question.order,
    ]) ?? [],
  );
  const examTitle = snapshot?.exam.title ?? attempt.examVersion?.title;

  if (examTitle === undefined) {
    throw new ExamContentAttemptIntegrityError(
      'Persisted V2 attempt has no submitted exam title',
    );
  }

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

      const snapshotQuestion = snapshotQuestionByExternalId?.get(
        answer.questionExternalId,
      );
      const questionOrder = snapshotQuestion?.order
        ?? fallbackQuestionOrderByExternalId.get(answer.questionExternalId);

      if (questionOrder === undefined) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted V2 attempt answer has no submitted question order',
        );
      }

      if (snapshotQuestionByExternalId !== null) {

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
        questionOrder,
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

  answers.sort((left, right) => left.questionOrder - right.questionOrder);

  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    examVersionId: attempt.examVersionId,
    examTitle,
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
