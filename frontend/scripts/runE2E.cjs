const { spawn } = require('child_process');
const path = require('path');

const frontendDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(frontendDir, '..', 'backend');

function start(command, args, cwd, env = {}) {
  return spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    windowsHide: true,
  });
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
  const backend = start(process.execPath, [path.join(backendDir, 'node_modules', 'ts-node', 'dist', 'bin.js'), 'server.ts'], backendDir);
  const frontend = start(process.execPath, [path.join(frontendDir, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--hostname', '127.0.0.1'], frontendDir, { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:5000' });
  try {
    await waitFor('http://127.0.0.1:5000/api/health', 'Backend');
    await waitFor('http://127.0.0.1:3000', 'Frontend');
    const test = start(process.execPath, [path.join(frontendDir, 'node_modules', '@playwright', 'test', 'cli.js'), 'test', ...process.argv.slice(2)], frontendDir);
    const exitCode = await new Promise((resolve) => test.once('close', (code) => resolve(code ?? 1)));
    process.exitCode = exitCode;
  } finally {
    stop(frontend);
    stop(backend);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
