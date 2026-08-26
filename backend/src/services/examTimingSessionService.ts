import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { ExamTimingSessionStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getValidatedExamContentById } from './examContentReadService';

const millisecondsPerSecond = 1_000;

export class ExamTimingSessionError extends Error {
  constructor(
    readonly code: 'not_found' | 'forbidden' | 'expired' | 'submitted' | 'mismatch',
  ) {
    super(`Exam timing session ${code}`);
  }
}

export type ExamTimingSessionAccess = {
  readonly userId?: string;
  readonly anonymousToken?: string;
};

export type ExamTimingSessionDto = {
  readonly id: string;
  readonly examId: string;
  readonly examVersionId: string;
  readonly status: 'in_progress' | 'submitted' | 'expired';
  readonly startedAt: string;
  readonly expiresAt: string;
  readonly anonymousTimingSessionToken?: string;
};

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const hasMatchingToken = (expectedHash: string, rawToken: string): boolean => {
  const actualHash = hashToken(rawToken);
  return expectedHash.length === actualHash.length && timingSafeEqual(
    Buffer.from(expectedHash, 'utf8'),
    Buffer.from(actualHash, 'utf8'),
  );
};

function toEffectiveStatus(
  status: ExamTimingSessionStatus,
  expiresAt: Date,
  now: Date,
): 'in_progress' | 'submitted' | 'expired' {
  if (status === 'submitted') return 'submitted';
  return expiresAt <= now ? 'expired' : 'in_progress';
}

function toDto(session: {
  id: string;
  examId: string;
  examVersionId: string;
  status: ExamTimingSessionStatus;
  startedAt: Date;
  expiresAt: Date;
}, now: Date, anonymousTimingSessionToken?: string): ExamTimingSessionDto {
  return {
    id: session.id,
    examId: session.examId,
    examVersionId: session.examVersionId,
    status: toEffectiveStatus(session.status, session.expiresAt, now),
    startedAt: session.startedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    ...(anonymousTimingSessionToken === undefined ? {} : { anonymousTimingSessionToken }),
  };
}

function assertAccess(
  session: { userId: string | null; anonymousTokenHash: string | null },
  access: ExamTimingSessionAccess,
): void {
  if (session.userId !== null) {
    if (access.userId !== session.userId) throw new ExamTimingSessionError('forbidden');
    return;
  }
  if (session.anonymousTokenHash === null || access.anonymousToken === undefined || !hasMatchingToken(session.anonymousTokenHash, access.anonymousToken)) {
    throw new ExamTimingSessionError('forbidden');
  }
}

export async function startExamTimingSession(
  examId: string,
  examVersionId: string,
  userId: string | undefined,
  now = new Date(),
): Promise<ExamTimingSessionDto | null> {
  const exam = await getValidatedExamContentById(examId, examVersionId);
  if (exam === null) return null;

  const anonymousTimingSessionToken = userId === undefined
    ? randomBytes(32).toString('base64url')
    : undefined;
  const expiresAt = new Date(now.getTime() + exam.durationMinutes * 60 * millisecondsPerSecond);
  const session = await prisma.examTimingSession.create({
    data: {
      examId: exam.id,
      examVersionId: exam.versionId,
      ...(userId === undefined
        ? { anonymousTokenHash: hashToken(anonymousTimingSessionToken!) }
        : { userId }),
      startedAt: now,
      expiresAt,
    },
    select: {
      id: true,
      examId: true,
      examVersionId: true,
      status: true,
      startedAt: true,
      expiresAt: true,
    },
  });
  return toDto(session, now, anonymousTimingSessionToken);
}

export async function getExamTimingSession(
  sessionId: string,
  access: ExamTimingSessionAccess,
  now = new Date(),
): Promise<ExamTimingSessionDto | null> {
  const session = await prisma.examTimingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true, examId: true, examVersionId: true, userId: true,
      anonymousTokenHash: true, status: true, startedAt: true, expiresAt: true,
    },
  });
  if (session === null) return null;
  assertAccess(session, access);
  if (session.status === 'in_progress' && session.expiresAt <= now) {
    await prisma.examTimingSession.updateMany({
      where: { id: session.id, status: 'in_progress' },
      data: { status: 'expired' },
    });
    return toDto({ ...session, status: 'expired' }, now);
  }
  return toDto(session, now);
}

export async function authorizeTimingSessionForSubmission(
  tx: Prisma.TransactionClient,
  input: {
    readonly sessionId: string;
    readonly examId: string;
    readonly examVersionId: string;
    readonly access: ExamTimingSessionAccess;
    readonly now: Date;
  },
): Promise<{ readonly startedAt: Date; readonly durationSeconds: number }> {
  const session = await tx.examTimingSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true, examId: true, examVersionId: true, userId: true,
      anonymousTokenHash: true, status: true, startedAt: true, expiresAt: true,
    },
  });
  if (session === null) throw new ExamTimingSessionError('not_found');
  assertAccess(session, input.access);
  if (session.examId !== input.examId || session.examVersionId !== input.examVersionId) {
    throw new ExamTimingSessionError('mismatch');
  }
  if (session.status === 'submitted') throw new ExamTimingSessionError('submitted');
  if (session.status === 'expired' || session.expiresAt <= input.now) {
    throw new ExamTimingSessionError('expired');
  }
  return {
    startedAt: session.startedAt,
    durationSeconds: Math.max(0, Math.ceil((input.now.getTime() - session.startedAt.getTime()) / millisecondsPerSecond)),
  };
}
