import assert from 'assert';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createApp } from '../app';
import { disconnectPrisma } from '../lib/prisma';

async function main(): Promise<void> {
  const server = createApp().listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', message: 'ManMath API is running' });

    const ready = await fetch(`${baseUrl}/api/ready`);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: 'ready' });

    const oversized = await fetch(`${baseUrl}/api/v2/exams/anything/grade`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(1_100_000) }),
    });
    assert.equal(oversized.status, 413);

    console.log('Operational readiness verification passed');
  } finally {
    await new Promise<void>((resolve, reject) => {
      (server as Server).close((error) => error ? reject(error) : resolve());
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
