import { Prisma } from '@prisma/client';
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

function toLegacyScore(scoreUnits: ScoreUnits): number {
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
  const exam = await getValidatedExamContentById(examId);

  if (exam === null) {
    return null;
  }

  const grading = gradeValidatedExamContent(exam, rawPayload);
  const maximumScoreUnits = calculateMaximumScoreUnits(exam.questions);
  const examContentSnapshot = buildExamContentSnapshotV1(exam);
  const gradingResultByQuestionId = new Map(
    grading.results.map((result) => [result.questionId, result]),
  );

  return prisma.$transaction(async (tx) => {
    const persistedQuestions = await tx.question.findMany({
      where: {
        examId: exam.id,
        externalId: {
          in: exam.questions.map((question) => question.id),
        },
      },
      select: {
        id: true,
        externalId: true,
        type: true,
      },
    });
    const persistedQuestionByExternalId = new Map(
      persistedQuestions.flatMap((question) =>
        question.externalId === null
          ? []
          : [[question.externalId, question] as const],
      ),
    );

    if (persistedQuestionByExternalId.size !== exam.questions.length) {
      throw new ExamContentAttemptIntegrityError(
        'Persisted V2 questions do not match the validated exam content',
      );
    }

    const attempt = await tx.attempt.create({
      data: {
        examId: exam.id,
        userId: userId ?? null,
        score: toLegacyScore(grading.totalAwardedScore),
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
        answers: {
          create: exam.questions.map((question) => {
            const persistedQuestion = persistedQuestionByExternalId.get(
              question.id,
            );
            const gradingResult = gradingResultByQuestionId.get(question.id);

            if (persistedQuestion === undefined || gradingResult === undefined) {
              throw new ExamContentAttemptIntegrityError(
                `Question ${question.id} cannot be persisted for this attempt`,
              );
            }

            if (persistedQuestion.type !== question.type) {
              throw new ExamContentAttemptIntegrityError(
                `Question ${question.id} changed type during attempt creation`,
              );
            }

            return {
              questionId: persistedQuestion.id,
              selectedOptionIndex: null,
              correctOptionIndex: null,
              isCorrect: gradingResult.isCorrect,
              questionExternalId: question.id,
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
  userId: string,
): Promise<ExamContentAttemptReceiptDto | null> {
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    select: {
      id: true,
      examId: true,
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
          questionType: true,
          response: true,
          awardedScoreUnits: true,
          maxScoreUnits: true,
          isFullyCorrect: true,
        },
      },
    },
  });

  if (attempt === null) {
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
        answer.questionType === null ||
        answer.awardedScoreUnits === null ||
        answer.maxScoreUnits === null ||
        answer.isFullyCorrect === null
      ) {
        throw new ExamContentAttemptIntegrityError(
          'Persisted V2 attempt answer is incomplete',
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
