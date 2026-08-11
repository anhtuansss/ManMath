import assert from 'assert';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createApp } from '../app';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { signAuthToken } from '../lib/jwt';

const examId = 'thpt-math-v2-sample';

async function main(): Promise<void> {
  const version = await prisma.examVersion.findFirst({
    where: { examId, status: 'published' },
    orderBy: { versionNumber: 'desc' },
    select: { id: true },
  });
  assert.notEqual(version, null, 'Fixture needs a published V2 version');

  const suffix = Date.now().toString();
  const user = await prisma.user.create({
    data: {
      email: `verify-legacy-containment-${suffix}@example.test`,
      authProvider: 'password',
      passwordHash: 'not-used',
    },
  });
  const token = signAuthToken({ userId: user.id, email: user.email });

  const server = createApp().listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const created = await fetch(`${baseUrl}/api/v2/exams/${examId}/attempts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ examVersionId: version!.id, responses: [] }),
    });
    assert.equal(created.status, 201);
    const payload = await created.json() as { attemptId: string };

    const legacyAttempts = await fetch(`${baseUrl}/api/exams/${examId}/attempts`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(legacyAttempts.status, 409);

    const legacyAttemptDetail = await fetch(`${baseUrl}/api/attempts/${payload.attemptId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(legacyAttemptDetail.status, 409);

    const legacySubmit = await fetch(`${baseUrl}/api/exam/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ examId, answers: {} }),
    });
    assert.equal(legacySubmit.status, 409);

    // A real legacy exam, when present, keeps its existing reader contract.
    const legacyExam = await prisma.exam.findFirst({
      where: { contentEngine: { not: 'v2' } },
      select: { id: true },
    });
    if (legacyExam !== null) {
      const legacyDetail = await fetch(`${baseUrl}/api/exams/${legacyExam.id}`);
      assert.equal(legacyDetail.status, 200);
    }

    console.log('Legacy history containment verification passed');
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
