import assert from 'assert';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { createApp } from '../app';
import { assertVerificationDatabase } from '../config/verificationDatabase';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { signAuthToken } from '../lib/jwt';
import { importExamContent } from '../services/examContentImportService';
import { publishDraftExamVersion } from '../services/examVersionPublishService';
import { validateExamContentImportPayload } from './importExamContentValidator';

const forbiddenPreviewFields = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
  'answer',
  'tolerance',
  'values',
]);

function assertNoPreviewAnswerKeys(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoPreviewAnswerKeys);
    return;
  }
  if (typeof value !== 'object' || value === null) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(forbiddenPreviewFields.has(key), false, `Draft preview exposed ${key}`);
    assertNoPreviewAnswerKeys(nestedValue);
  }
}

async function main(): Promise<void> {
  assertVerificationDatabase();
  const originalAllowlist = process.env.DRAFT_PREVIEW_AUTHORIZED_EMAILS;
  const suffix = Date.now().toString();
  const authorizedEmail = `preview-author-${suffix}@example.test`;
  const unauthorizedEmail = `preview-reader-${suffix}@example.test`;
  process.env.DRAFT_PREVIEW_AUTHORIZED_EMAILS = `  ${authorizedEmail.toUpperCase()}  `;

  const fixture = require('../test-fixtures/v2-minimal-exam.json') as Record<string, unknown>;
  const examId = `verify-v2-draft-preview-${suffix}`;
  const raw = JSON.parse(JSON.stringify(fixture)) as Record<string, unknown>;
  raw.exam = { ...(raw.exam as Record<string, unknown>), id: examId };
  await importExamContent(validateExamContentImportPayload(raw));

  const authorizedUser = await prisma.user.create({
    data: { email: authorizedEmail, authProvider: 'password', passwordHash: 'not-used' },
  });
  const unauthorizedUser = await prisma.user.create({
    data: { email: unauthorizedEmail, authProvider: 'password', passwordHash: 'not-used' },
  });
  const authorizedToken = signAuthToken({ userId: authorizedUser.id, email: authorizedEmail.toUpperCase() });
  const unauthorizedToken = signAuthToken({ userId: unauthorizedUser.id, email: unauthorizedEmail });

  const server = createApp().listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const previewPath = `${baseUrl}/api/v2/internal/exam-previews/${examId}`;

    assert.equal((await fetch(previewPath)).status, 401);
    assert.equal((await fetch(previewPath, {
      headers: { authorization: `Bearer ${unauthorizedToken}` },
    })).status, 403);

    const previewResponse = await fetch(previewPath, {
      headers: { authorization: `Bearer ${authorizedToken}` },
    });
    assert.equal(previewResponse.status, 200);
    const preview = await previewResponse.json() as { examVersionId: string; questions: unknown[] };
    assert.equal(typeof preview.examVersionId, 'string');
    assert.equal(preview.questions.length, 3);
    assertNoPreviewAnswerKeys(preview);

    // A draft must remain invisible through the public published-only route.
    assert.equal((await fetch(`${baseUrl}/api/v2/exams/${examId}`)).status, 404);

    await publishDraftExamVersion(examId);
    assert.equal((await fetch(previewPath, {
      headers: { authorization: `Bearer ${authorizedToken}` },
    })).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/v2/exams/${examId}`)).status, 200);

    console.log('Exam draft preview verification passed');
  } finally {
    if (originalAllowlist === undefined) delete process.env.DRAFT_PREVIEW_AUTHORIZED_EMAILS;
    else process.env.DRAFT_PREVIEW_AUTHORIZED_EMAILS = originalAllowlist;
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
