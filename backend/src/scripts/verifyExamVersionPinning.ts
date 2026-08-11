import assert from 'assert';
import { disconnectPrisma } from '../lib/prisma';
import { validateExamContentImportPayload } from './importExamContentValidator';
import { importExamContent } from '../services/examContentImportService';
import { publishDraftExamVersion } from '../services/examVersionPublishService';
import { createExamContentAttempt } from '../services/examContentAttemptService';
import { ExamContentNotV2Error, getPublicExamContentById } from '../services/examContentReadService';

const fixture = require('../data/import/sample-exam-content-v2.json') as Record<string, unknown>;

function makeFixture(examId: string, description: string): unknown {
  const copy = JSON.parse(JSON.stringify(fixture)) as Record<string, unknown>;
  copy.exam = { ...(copy.exam as Record<string, unknown>), id: examId, description };
  return copy;
}

async function submit(examId: string, examVersionId: string) {
  return createExamContentAttempt(examId, { examVersionId, responses: [] });
}

async function main(): Promise<void> {
  const examId = `verify-version-pinning-${Date.now()}`;
  await importExamContent(validateExamContentImportPayload(makeFixture(examId, 'draft v1')));
  await assert.rejects(() => getPublicExamContentById(examId), ExamContentNotV2Error);

  const v1 = await publishDraftExamVersion(examId);
  const publicV1 = await getPublicExamContentById(examId);
  assert.equal(publicV1?.examVersionId, v1.versionId);
  assert.notEqual(await submit(examId, v1.versionId), null);

  await importExamContent(validateExamContentImportPayload(makeFixture(examId, 'draft v2')));
  const stillPublicV1 = await getPublicExamContentById(examId);
  assert.equal(stillPublicV1?.examVersionId, v1.versionId);
  assert.notEqual(await submit(examId, v1.versionId), null);

  const v2 = await publishDraftExamVersion(examId);
  const publicV2 = await getPublicExamContentById(examId);
  assert.equal(publicV2?.examVersionId, v2.versionId);
  await assert.rejects(() => submit(examId, v1.versionId), ExamContentNotV2Error);
  assert.notEqual(await submit(examId, v2.versionId), null);

  console.log('Exam version pinning verification passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
