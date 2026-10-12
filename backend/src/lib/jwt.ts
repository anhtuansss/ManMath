import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/env';

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

const isJwtPayload = (value: string | JwtPayload): value is JwtPayload => {
  return typeof value !== 'string';
};

export const signAuthToken = (payload: AuthTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
    subject: payload.userId,
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (!isJwtPayload(decoded)) {
    throw new Error('Invalid auth token payload');
  }

  const userId =
    typeof decoded.userId === 'string'
      ? decoded.userId
      : typeof decoded.sub === 'string'
        ? decoded.sub
        : null;
  const email = typeof decoded.email === 'string' ? decoded.email : null;

  if (!userId || !email) {
    throw new Error('Invalid auth token payload');
  }

  return {
    userId,
    email,
  };
};
