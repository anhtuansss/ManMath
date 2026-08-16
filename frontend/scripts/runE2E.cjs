const { spawn } = require('child_process');
const path = require('path');

const frontendDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(frontendDir, '..', 'backend');
const dotenv = require(path.join(backendDir, 'node_modules', 'dotenv'));
require(path.join(backendDir, 'node_modules', 'ts-node', 'register'));
const {
  assertVerificationDatabaseConfiguration,
} = require(path.join(backendDir, 'src', 'config', 'verificationDatabase'));

const backendEnvironment = dotenv.config({ path: path.join(backendDir, '.env') });

function start(command, args, cwd, env = {}) {
  return spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    windowsHide: true,
  });
}

function run(command, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = start(command, args, cwd, env);
    child.once('error', reject);
    child.once('close', (exitCode) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${exitCode ?? 'unknown'}`));
    });
  });
}

function verificationEnvironment() {
  const primaryDatabaseUrl = process.env.DATABASE_URL?.trim()
    || backendEnvironment.parsed?.DATABASE_URL?.trim();
  const verifyDatabaseUrl = process.env.VERIFY_DATABASE_URL;
  const confirmation = process.env.VERIFY_DATABASE_CONFIRM;
  const environment = { ...process.env };

  environment.DATABASE_URL = verifyDatabaseUrl;
  environment.MANMATH_PRIMARY_DATABASE_URL = primaryDatabaseUrl;
  environment.MANMATH_VERIFICATION_DATABASE = '1';

  assertVerificationDatabaseConfiguration({
    activeDatabaseUrl: environment.DATABASE_URL,
    verifyDatabaseUrl,
    primaryDatabaseUrl,
    confirmation,
    verificationMode: environment.MANMATH_VERIFICATION_DATABASE,
  });

  return environment;
}

function prismaCliPath() {
  return path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
}

function tsNodePath() {
  return path.join(backendDir, 'node_modules', 'ts-node', 'dist', 'bin.js');
}

function resetVerificationDatabase(env) {
  return run(process.execPath, [prismaCliPath(), 'migrate', 'reset', '--force'], backendDir, env);
}

function prepareVerificationDatabase(env) {
  return run(process.execPath, [tsNodePath(), 'src/scripts/prepareVerificationDatabase.ts'], backendDir, env);
}

async function waitFor(url, label) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready: ${url}`);
}

function stop(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    // Do not await taskkill: on Windows a killed dev-server tree can keep the
    // taskkill handle open, while this runner itself must be able to exit.
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    killer.unref();
    return;
  }
  child.kill('SIGTERM');
}

async function main() {
  const env = verificationEnvironment();
  let backend;
  let frontend;
  let resetStarted = false;
  try {
    resetStarted = true;
    await resetVerificationDatabase(env);
    await prepareVerificationDatabase(env);
    backend = start(process.execPath, [tsNodePath(), 'server.ts'], backendDir, env);
    frontend = start(process.execPath, [path.join(frontendDir, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--hostname', '127.0.0.1'], frontendDir, { ...env, NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:5000' });
    await waitFor('http://127.0.0.1:5000/api/health', 'Backend');
    await waitFor('http://127.0.0.1:3000', 'Frontend');
    const test = start(process.execPath, [path.join(frontendDir, 'node_modules', '@playwright', 'test', 'cli.js'), 'test', ...process.argv.slice(2)], frontendDir);
    const exitCode = await new Promise((resolve) => test.once('close', (code) => resolve(code ?? 1)));
    process.exitCode = exitCode;
  } finally {
    stop(frontend);
    stop(backend);
    if (resetStarted) await resetVerificationDatabase(env);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
