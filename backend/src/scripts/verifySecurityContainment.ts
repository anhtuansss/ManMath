import assert from 'assert';
import type { AddressInfo } from 'net';
import { createApp } from '../app';
import { disconnectPrisma, prisma } from '../lib/prisma';
import { validateExamContentImportPayload } from './importExamContentValidator';
import { importExamContent } from '../services/examContentImportService';
import { publishDraftExamVersion } from '../services/examVersionPublishService';
import { assertVerificationDatabase } from '../config/verificationDatabase';

const forbiddenV2PublicFields = new Set([
  'answerKey',
  'correctAnswer',
  'correctChoiceId',
  'answer',
  'tolerance',
  'values',
  'solution',
  'explanation',
]);

function assertNoForbiddenV2PublicFields(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(assertNoForbiddenV2PublicFields);
  if (typeof value !== 'object' || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(forbiddenV2PublicFields.has(key), false, `Public V2 response exposed ${key}`);
    assertNoForbiddenV2PublicFields(nested);
  }
}

async function main(): Promise<void> {
  assertVerificationDatabase();
  const server = createApp().listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const retiredDetail = await fetch(`${baseUrl}/api/exams/verify-v2-minimal-exam`);
    assert.equal(retiredDetail.status, 404);

    const retiredPractice = await fetch(`${baseUrl}/api/practice/topic/ham-so`);
    assert.equal(retiredPractice.status, 404);

    const v2Public = await fetch(`${baseUrl}/api/v2/exams/verify-v2-minimal-exam`);
    assert.equal(v2Public.status, 200);
    assertNoForbiddenV2PublicFields(await v2Public.json());

    const fixture = require('../test-fixtures/v2-minimal-exam.json') as Record<string, unknown>;
    const examId = `verify-v2-discovery-${Date.now()}`;
    const raw = JSON.parse(JSON.stringify(fixture)) as Record<string, unknown>;
    raw.exam = { ...(raw.exam as Record<string, unknown>), id: examId };
    await importExamContent(validateExamContentImportPayload(raw));
    await publishDraftExamVersion(examId);
    assert.equal(await prisma.examVersionQuestion.count({
      where: { examVersion: { examId } },
    }), 3);

    const discovery = await fetch(`${baseUrl}/api/exams`);
    assert.equal(discovery.status, 200);
    const summaries = await discovery.json() as Array<{ id: string; totalQuestions: number }>;
    const summary = summaries.find((item) => item.id === examId);
    assert.equal(summary?.totalQuestions, 3);

    console.log('Security containment verification passed');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
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
