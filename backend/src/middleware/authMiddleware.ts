import type { NextFunction, Request, Response } from 'express';
import { isDraftPreviewAuthorizedEmail } from '../config/env';
import { verifyAuthToken, type AuthTokenPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

const getBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

/** Requires a verified JWT whose email is in the internal preview allowlist. */
export const draftPreviewAuthorizationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user === undefined) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!isDraftPreviewAuthorizedEmail(req.user.email)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  next();
};
