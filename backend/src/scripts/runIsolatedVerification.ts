import { spawn } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
import {
  assertVerificationDatabaseConfiguration,
} from '../config/verificationDatabase';

// The runner needs the primary URL only to prove the verification target is
// different. Keep an explicitly configured non-empty value, but accept the
// backend-local .env value when a shell has exported DATABASE_URL as empty.
const backendEnvironment = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type VerificationTarget = 'all' | 'security-containment' | 'version-pinning' | 'draft-preview' | 'practice' | 'analytics' | 'attempt-persistence' | 'attempt-read' | 'history-immutability';

const targetScripts: Record<Exclude<VerificationTarget, 'all'>, string> = {
  'security-containment': 'src/scripts/verifySecurityContainment.ts',
  'version-pinning': 'src/scripts/verifyExamVersionPinning.ts',
  'draft-preview': 'src/scripts/verifyExamDraftPreview.ts',
  practice: 'src/scripts/verifyV2Practice.ts',
  analytics: 'src/scripts/verifyV2Analytics.ts',
  'attempt-persistence': 'src/scripts/verifyExamContentAttemptPersistence.ts',
  'attempt-read': 'src/scripts/verifyExamContentAttemptRead.ts',
  'history-immutability': 'src/scripts/verifyHistoryImmutability.ts',
};

function readTarget(argv: readonly string[]): VerificationTarget {
  if (argv.length === 0) return 'all';
  if (
    argv.length === 1 &&
    (argv[0] === 'security-containment' || argv[0] === 'version-pinning' || argv[0] === 'draft-preview' || argv[0] === 'practice' || argv[0] === 'analytics' || argv[0] === 'attempt-persistence' || argv[0] === 'attempt-read' || argv[0] === 'history-immutability')
  ) {
    return argv[0];
  }
  throw new Error('Usage: verify:isolated [security-containment|version-pinning|draft-preview|practice|analytics|attempt-persistence|attempt-read|history-immutability]');
}

function verificationEnvironment(): NodeJS.ProcessEnv {
  const primaryDatabaseUrl = process.env.DATABASE_URL?.trim()
    || backendEnvironment.parsed?.DATABASE_URL?.trim();
  const verifyDatabaseUrl = process.env.VERIFY_DATABASE_URL;
  const confirmation = process.env.VERIFY_DATABASE_CONFIRM;
  const childEnvironment: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      childEnvironment[key] = value;
    }
  }

  childEnvironment.DATABASE_URL = verifyDatabaseUrl;
  childEnvironment.MANMATH_PRIMARY_DATABASE_URL = primaryDatabaseUrl;
  childEnvironment.MANMATH_VERIFICATION_DATABASE = '1';

  // This guard runs before prisma reset, import, publish, or any verify script.
  assertVerificationDatabaseConfiguration({
    activeDatabaseUrl: childEnvironment.DATABASE_URL,
    verifyDatabaseUrl,
    primaryDatabaseUrl,
    confirmation,
    verificationMode: childEnvironment.MANMATH_VERIFICATION_DATABASE,
  });

  return childEnvironment;
}

function run(command: string, args: readonly string[], environment: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('close', (exitCode) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${exitCode ?? 'unknown'}`));
    });
  });
}

function packageEntrypoint(...segments: readonly string[]): string {
  return path.join(process.cwd(), 'node_modules', ...segments);
}

async function resetVerificationDatabase(environment: NodeJS.ProcessEnv): Promise<void> {
  await run(
    process.execPath,
    [
      packageEntrypoint('prisma', 'build', 'index.js'),
      'migrate',
      'reset',
      '--force',
    ],
    environment,
  );
}

async function runTypeScript(
  scriptPath: string,
  environment: NodeJS.ProcessEnv,
  args: readonly string[] = [],
): Promise<void> {
  await run(
    process.execPath,
    [packageEntrypoint('ts-node', 'dist', 'bin.js'), scriptPath, ...args],
    environment,
  );
}

async function main(): Promise<void> {
  const target = readTarget(process.argv.slice(2));
  const environment = verificationEnvironment();
  let resetStarted = false;

  try {
    resetStarted = true;
    await resetVerificationDatabase(environment);
    await runTypeScript('src/scripts/syncCanonicalTaxonomy.ts', environment, ['--write']);
    await runTypeScript('src/scripts/prepareVerificationDatabase.ts', environment);

    const scripts = target === 'all'
      ? Object.values(targetScripts)
      : [targetScripts[target]];
    for (const script of scripts) {
      await runTypeScript(script, environment);
    }
  } finally {
    if (resetStarted) {
      await resetVerificationDatabase(environment);
    }
  }
}

main().catch((error) => {
  console.error('Isolated verification failed:', error);
  process.exitCode = 1;
});
