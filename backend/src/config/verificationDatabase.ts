const VERIFY_CONFIRMATION = 'MANMATH_VERIFY_DB';

type VerificationDatabaseConfiguration = {
  readonly activeDatabaseUrl: string | undefined;
  readonly verifyDatabaseUrl: string | undefined;
  readonly primaryDatabaseUrl: string | undefined;
  readonly confirmation: string | undefined;
  readonly verificationMode: string | undefined;
};

function normalizeDatabaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = '';
  return url.toString();
}

function getDatabaseName(rawUrl: string): string {
  const url = new URL(rawUrl);
  return decodeURIComponent(url.pathname).replace(/^\/+/, '').toLowerCase();
}

function requireNonEmpty(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Verification database guard failed: missing ${name}`);
  }
  return value.trim();
}

/**
 * Verifies a child process is pointed at the explicitly disposable database.
 * This has no database side effects and must run before every mutation script.
 */
export function assertVerificationDatabaseConfiguration(
  configuration: VerificationDatabaseConfiguration,
): void {
  const verifyDatabaseUrl = requireNonEmpty(
    configuration.verifyDatabaseUrl,
    'VERIFY_DATABASE_URL',
  );
  const primaryDatabaseUrl = requireNonEmpty(
    configuration.primaryDatabaseUrl,
    'MANMATH_PRIMARY_DATABASE_URL',
  );
  const activeDatabaseUrl = requireNonEmpty(
    configuration.activeDatabaseUrl,
    'DATABASE_URL',
  );

  if (configuration.confirmation !== VERIFY_CONFIRMATION) {
    throw new Error('Verification database guard failed: invalid VERIFY_DATABASE_CONFIRM');
  }

  if (configuration.verificationMode !== '1') {
    throw new Error('Verification database guard failed: MANMATH_VERIFICATION_DATABASE must be 1');
  }

  let active: string;
  let verify: string;
  let primary: string;
  let databaseName: string;
  try {
    active = normalizeDatabaseUrl(activeDatabaseUrl);
    verify = normalizeDatabaseUrl(verifyDatabaseUrl);
    primary = normalizeDatabaseUrl(primaryDatabaseUrl);
    databaseName = getDatabaseName(verifyDatabaseUrl);
  } catch {
    throw new Error('Verification database guard failed: database URL is invalid');
  }

  if (active !== verify) {
    throw new Error('Verification database guard failed: DATABASE_URL is not VERIFY_DATABASE_URL');
  }

  if (active === primary) {
    throw new Error('Verification database guard failed: verification database must differ from primary DATABASE_URL');
  }

  if (!databaseName.endsWith('_verify')) {
    throw new Error('Verification database guard failed: database name must end with _verify');
  }
}

export function assertVerificationDatabase(): void {
  assertVerificationDatabaseConfiguration({
    activeDatabaseUrl: process.env.DATABASE_URL,
    verifyDatabaseUrl: process.env.VERIFY_DATABASE_URL,
    primaryDatabaseUrl: process.env.MANMATH_PRIMARY_DATABASE_URL,
    confirmation: process.env.VERIFY_DATABASE_CONFIRM,
    verificationMode: process.env.MANMATH_VERIFICATION_DATABASE,
  });
}

export const verificationDatabaseConfirmation = VERIFY_CONFIRMATION;
