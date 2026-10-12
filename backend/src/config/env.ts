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

export const normalizeEmailForComparison = (email: string): string =>
  email.trim().toLocaleLowerCase('en-US');

/**
 * Internal preview access is intentionally configuration-based until the
 * project introduces persisted staff roles. An empty allowlist denies access.
 */
export const isDraftPreviewAuthorizedEmail = (email: string): boolean => {
  const authorizedEmails = new Set(
    (process.env.DRAFT_PREVIEW_AUTHORIZED_EMAILS ?? '')
      .split(',')
      .map(normalizeEmailForComparison)
      .filter(Boolean),
  );

  return authorizedEmails.has(normalizeEmailForComparison(email));
};

const rawCorsOrigins = (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN)?.trim();
export const CORS_ORIGINS = rawCorsOrigins
  ? rawCorsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

const STATIC_ALLOWED_ORIGINS = new Set([
  'https://man-math-six.vercel.app',
  ...CORS_ORIGINS,
]);

const VERCEL_PREVIEW_ORIGIN_REGEX =
  /^https:\/\/man-math-[a-zA-Z0-9-]+(?:-anhtuansss-projects)?\.vercel\.app$/;

export const isAllowedOrigin = (origin: string): boolean => {
  if (STATIC_ALLOWED_ORIGINS.has(origin)) {
    return true;
  }
  return VERCEL_PREVIEW_ORIGIN_REGEX.test(origin);
};

