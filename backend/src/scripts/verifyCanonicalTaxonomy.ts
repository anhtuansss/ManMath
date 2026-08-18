import assert from 'assert';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  CANONICAL_SUBTOPICS,
  CANONICAL_TOPICS,
  getCanonicalSubtopic,
} from '../data/canonicalTaxonomy';
import {
  ExamContentImportValidationError,
  validateExamContentImportPayload,
} from './importExamContentValidator';

async function main(): Promise<void> {
  assert.equal(CANONICAL_TOPICS.length, 12);
  assert.equal(new Set(CANONICAL_TOPICS.map((topic) => topic.slug)).size, 12);
  assert.equal(CANONICAL_SUBTOPICS.length, 82);
  assert.equal(new Set(CANONICAL_SUBTOPICS.map((subtopic) => subtopic.slug)).size, 82);
  for (const subtopic of CANONICAL_SUBTOPICS) {
    assert.equal(
      CANONICAL_TOPICS.some((topic) => topic.slug === subtopic.topicSlug),
      true,
      `Unknown canonical topic for ${subtopic.slug}`,
    );
  }

  const fixturePath = path.resolve(process.cwd(), 'src/test-fixtures/v2-minimal-exam.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as Record<string, unknown>;
  validateExamContentImportPayload(fixture);

  const legacySlugFixture = JSON.parse(JSON.stringify(fixture)) as {
    taxonomy: { topics: Array<{ slug: string }> };
  };
  legacySlugFixture.taxonomy.topics[0]!.slug = 'ham-so';
  assert.throws(
    () => validateExamContentImportPayload(legacySlugFixture),
    (error: unknown) => error instanceof ExamContentImportValidationError
      && error.issues.some((issue) => issue.includes('unknown canonical slug')),
  );

  assert.equal(
    getCanonicalSubtopic('khoang-cach-trong-khong-gian')?.topicSlug,
    'hinh-hoc-khong-gian',
  );
  console.log('Canonical taxonomy verification passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
