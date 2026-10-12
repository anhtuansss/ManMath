import assert from 'assert';
import { validateExamContentImportPayload } from './importExamContentValidator';
import { validateExamPublishReadiness } from '../services/examPublishReadinessService';

const fixture = require('../test-fixtures/v2-minimal-exam.json') as unknown;
const envelope = validateExamContentImportPayload(fixture);

const practiceResult = validateExamPublishReadiness({
  publishProfile: 'practice',
  durationMinutes: envelope.exam.durationMinutes,
  scoringPolicyId: 'vietnam_thpt_math_2025',
  questions: envelope.questions,
});
assert.equal(practiceResult.ok, true);

const officialResult = validateExamPublishReadiness({
  publishProfile: 'official_full_exam',
  durationMinutes: envelope.exam.durationMinutes,
  scoringPolicyId: 'vietnam_thpt_math_2025',
  questions: envelope.questions,
});
assert.equal(officialResult.ok, false);
if (!officialResult.ok) {
  assert.equal(officialResult.issues.some((issue) => issue.includes('22 question')), true);
  assert.equal(officialResult.issues.some((issue) => issue.includes('12 single_choice')), true);
}

console.log('Exam publish readiness verification passed');
