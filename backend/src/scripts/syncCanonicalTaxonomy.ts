import {
  CANONICAL_SUBTOPICS,
  CANONICAL_TOPICS,
} from '../data/canonicalTaxonomy';
import { disconnectPrisma, prisma } from '../lib/prisma';

type TaxonomyAudit = {
  readonly topicCount: number;
  readonly subtopicCount: number;
  readonly nonCanonicalTopicSlugs: readonly string[];
  readonly nonCanonicalSubtopicSlugs: readonly string[];
  readonly invalidCanonicalSubtopicCount: number;
};

function assertCanonicalSource(): void {
  const topicSlugs = new Set(CANONICAL_TOPICS.map((topic) => topic.slug));
  const subtopicSlugs = new Set(CANONICAL_SUBTOPICS.map((subtopic) => subtopic.slug));
  if (topicSlugs.size !== 12 || CANONICAL_TOPICS.length !== 12) {
    throw new Error('Canonical taxonomy must contain exactly 12 unique topics');
  }
  if (subtopicSlugs.size !== 82 || CANONICAL_SUBTOPICS.length !== 82) {
    throw new Error('Canonical taxonomy must contain exactly 82 unique subtopics');
  }
  for (const subtopic of CANONICAL_SUBTOPICS) {
    if (!topicSlugs.has(subtopic.topicSlug)) {
      throw new Error(`Canonical subtopic ${subtopic.slug} references unknown topic ${subtopic.topicSlug}`);
    }
  }
}

async function readAudit(): Promise<TaxonomyAudit> {
  const [topics, subtopics] = await Promise.all([
    prisma.topic.findMany({ select: { slug: true } }),
    prisma.subtopic.findMany({ select: { slug: true, topic: { select: { slug: true } } } }),
  ]);
  const canonicalTopicSlugs = new Set(CANONICAL_TOPICS.map((topic) => topic.slug));
  const canonicalSubtopicBySlug = new Map(
    CANONICAL_SUBTOPICS.map((subtopic) => [subtopic.slug, subtopic]),
  );

  return {
    topicCount: topics.length,
    subtopicCount: subtopics.length,
    nonCanonicalTopicSlugs: topics
      .map((topic) => topic.slug)
      .filter((slug) => !canonicalTopicSlugs.has(slug))
      .sort(),
    nonCanonicalSubtopicSlugs: subtopics
      .map((subtopic) => subtopic.slug)
      .filter((slug) => !canonicalSubtopicBySlug.has(slug))
      .sort(),
    invalidCanonicalSubtopicCount: subtopics.filter((subtopic) => {
      const canonical = canonicalSubtopicBySlug.get(subtopic.slug);
      return canonical !== undefined && canonical.topicSlug !== subtopic.topic.slug;
    }).length,
  };
}

async function synchronize(): Promise<void> {
  const canonicalTopicSlugs = CANONICAL_TOPICS.map((topic) => topic.slug);
  const canonicalSubtopicSlugs = CANONICAL_SUBTOPICS.map((subtopic) => subtopic.slug);

  await prisma.$transaction(async (tx) => {
    const conflictingTopicNames = await tx.topic.findMany({
      where: {
        name: { in: CANONICAL_TOPICS.map((topic) => topic.name) },
        slug: { notIn: canonicalTopicSlugs },
      },
      select: { name: true, slug: true },
    });
    if (conflictingTopicNames.length > 0) {
      throw new Error(`Cannot synchronize canonical topics with conflicting names: ${conflictingTopicNames.map((topic) => `${topic.name} (${topic.slug})`).join(', ')}`);
    }

    for (const topic of CANONICAL_TOPICS) {
      await tx.topic.upsert({
        where: { slug: topic.slug },
        update: { name: topic.name, order: topic.order },
        create: { name: topic.name, slug: topic.slug, order: topic.order },
      });
    }

    await tx.subtopic.deleteMany({
      where: { slug: { notIn: canonicalSubtopicSlugs } },
    });

    const topics = await tx.topic.findMany({
      where: { slug: { in: canonicalTopicSlugs } },
      select: { id: true, slug: true },
    });
    const topicIdBySlug = new Map(topics.map((topic) => [topic.slug, topic.id]));

    for (const subtopic of CANONICAL_SUBTOPICS) {
      const topicId = topicIdBySlug.get(subtopic.topicSlug);
      if (topicId === undefined) {
        throw new Error(`Canonical topic was not persisted: ${subtopic.topicSlug}`);
      }
      await tx.subtopic.upsert({
        where: { slug: subtopic.slug },
        update: { name: subtopic.name, topicId },
        create: { name: subtopic.name, slug: subtopic.slug, topicId },
      });
    }

    await tx.topic.deleteMany({
      where: { slug: { notIn: canonicalTopicSlugs } },
    });
  });
}

async function main(): Promise<void> {
  assertCanonicalSource();
  const before = await readAudit();
  const write = process.argv.includes('--write');
  console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', before }, null, 2));

  if (!write) {
    console.log('No database changes were made. Re-run with --write to synchronize taxonomy.');
    return;
  }

  await synchronize();
  const after = await readAudit();
  if (
    after.topicCount !== CANONICAL_TOPICS.length ||
    after.subtopicCount !== CANONICAL_SUBTOPICS.length ||
    after.nonCanonicalTopicSlugs.length > 0 ||
    after.nonCanonicalSubtopicSlugs.length > 0 ||
    after.invalidCanonicalSubtopicCount > 0
  ) {
    throw new Error(`Canonical taxonomy verification failed: ${JSON.stringify(after)}`);
  }
  console.log(JSON.stringify({ mode: 'write', after }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error('Canonical taxonomy synchronization failed:', error);
    process.exitCode = 1;
  })
  .finally(disconnectPrisma);
