import 'dotenv/config';

const readRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const readOptionalEnv = (name: string, fallback: string): string => {
  const value = process.env[name]?.trim();

  return value && value.length > 0 ? value : fallback;
};

export const DATABASE_URL = readRequiredEnv('DATABASE_URL');
export const GOOGLE_CLIENT_ID = readRequiredEnv('GOOGLE_CLIENT_ID');
export const JWT_SECRET = readRequiredEnv('JWT_SECRET');
export const JWT_EXPIRES_IN = readOptionalEnv('JWT_EXPIRES_IN', '7d');

const rawCorsOrigins = process.env.CORS_ORIGIN?.trim();
export const CORS_ORIGINS = rawCorsOrigins
  ? rawCorsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

if (process.env.NODE_ENV === 'production' && CORS_ORIGINS.length === 0) {
  throw new Error('Missing required environment variable: CORS_ORIGIN in production');
}
