import type { NextFunction, Request, Response } from 'express';

const WINDOW_MS = 60_000;
const UNIQUE_SUBMISSION_LIMIT = 12;
const REQUEST_LIMIT = 60;

type WindowState = {
  windowStartedAt: number;
  uniqueKeys: Set<string>;
  requestCount: number;
};

const windowsByScope = new Map<string, WindowState>();

function getScope(req: Request): string {
  return req.user === undefined ? `anonymous:${req.ip}` : `user:${req.user.userId}`;
}

/**
 * Process-local protection for submit bursts. Durable idempotency remains the
 * concurrency boundary; a deployment with multiple API instances needs a
 * shared limiter in a later operational phase.
 */
export const attemptSubmissionRateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const rawKey = req.header('Idempotency-Key');
  if (rawKey === undefined) {
    next();
    return;
  }

  const now = Date.now();
  const scope = getScope(req);
  const existing = windowsByScope.get(scope);
  const state = existing === undefined || now - existing.windowStartedAt >= WINDOW_MS
    ? { windowStartedAt: now, uniqueKeys: new Set<string>(), requestCount: 0 }
    : existing;
  windowsByScope.set(scope, state);

  if (state.requestCount >= REQUEST_LIMIT) {
    res.status(429).json({ message: 'Qua nhieu yeu cau nop bai. Vui long thu lai sau.' });
    return;
  }
  state.requestCount += 1;

  if (!state.uniqueKeys.has(rawKey) && state.uniqueKeys.size >= UNIQUE_SUBMISSION_LIMIT) {
    res.status(429).json({ message: 'Da vuot qua gioi han nop bai trong mot phut.' });
    return;
  }
  state.uniqueKeys.add(rawKey);
  next();
};

export function resetAttemptSubmissionRateLimitForVerification(): void {
  windowsByScope.clear();
}
