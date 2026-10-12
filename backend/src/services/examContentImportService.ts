import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import {
    CANONICAL_SUBTOPICS,
    CANONICAL_TOPICS,
} from '../data/canonicalTaxonomy';
import { prisma } from '../lib/prisma';
import type { ExamContentImportEnvelope } from '../scripts/importExamContentValidator';
import type { QuestionInput } from '../types/examContent';
import { validateExamPublishReadiness } from './examPublishReadinessService';


function toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function importExamContent(
    envelope: ExamContentImportEnvelope,
): Promise<void> {
    const readiness = validateExamPublishReadiness({
        publishProfile: envelope.publishProfile,
        durationMinutes: envelope.exam.durationMinutes,
        scoringPolicyId: 'vietnam_thpt_math_2025',
        questions: envelope.questions,
    });

    if (!readiness.ok) {
        throw new Error(`Import content is not publish-ready: ${readiness.issues.join('; ')}`);
    }

    await prisma.$transaction(async (tx) => {
        await upsertExam(tx, envelope);
        const taxonomyNames = await readCanonicalTaxonomyNames(tx);
        await upsertDraftExamVersion(tx, envelope, taxonomyNames);
    });
}

async function upsertExam(
    tx: Prisma.TransactionClient,
    envelope: ExamContentImportEnvelope,
): Promise<void> {
    const { exam } = envelope;
    await tx.exam.upsert({
        where: {
            id: exam.id,
        },
        update: {},
        create: {
            id: exam.id,
            title: exam.title,
            description: exam.description,
            durationMinutes: exam.durationMinutes,
            subject: exam.subject,
            difficulty: exam.difficulty,
            source: exam.source,
            year: exam.year,
            statusLabel: exam.statusLabel,
        },
    });
}

function buildContentChecksum(envelope: ExamContentImportEnvelope): string {
    return createHash('sha256')
        .update(JSON.stringify({
            publishProfile: envelope.publishProfile,
            exam: envelope.exam,
            taxonomy: envelope.taxonomy,
            questions: envelope.questions,
        }))
        .digest('hex');
}

function toExamVersionQuestionData(
    question: QuestionInput,
    topicNamesBySlug: ReadonlyMap<string, string>,
    subtopicNamesBySlug: ReadonlyMap<string, string>,
): Prisma.ExamVersionQuestionCreateWithoutExamVersionInput {
    const topicName = topicNamesBySlug.get(question.topicSlug);
    if (topicName === undefined) {
        throw new Error(`Validated question ${question.id} references missing topic ${question.topicSlug}`);
    }

    const subtopicName = question.subtopicSlug === undefined
        ? null
        : subtopicNamesBySlug.get(question.subtopicSlug);
    if (question.subtopicSlug !== undefined && subtopicName === undefined) {
        throw new Error(`Validated question ${question.id} references missing subtopic ${question.subtopicSlug}`);
    }

    const base = {
        externalId: question.id as string,
        order: question.order,
        type: question.type,
        section: question.section,
        content: question.content,
        topicSlug: question.topicSlug,
        topicName,
        subtopicSlug: question.subtopicSlug ?? null,
        subtopicName: subtopicName ?? null,
        assets: question.assets === undefined ? Prisma.DbNull : toJsonValue(question.assets),
        answerKey: toJsonValue(question.answerKey),
    };

    switch (question.type) {
        case 'single_choice':
            return {
                ...base,
                choices: toJsonValue(question.choices),
                statements: Prisma.DbNull,
            };
        case 'true_false_group':
            return {
                ...base,
                choices: Prisma.DbNull,
                statements: toJsonValue(question.statements),
            };
        case 'short_answer':
            return {
                ...base,
                choices: Prisma.DbNull,
                statements: Prisma.DbNull,
            };
    }
}

async function upsertDraftExamVersion(
    tx: Prisma.TransactionClient,
    envelope: ExamContentImportEnvelope,
    taxonomyNames: TaxonomyNames,
): Promise<void> {
    const draft = await tx.examVersion.findFirst({
        where: { examId: envelope.exam.id, status: 'draft' },
        orderBy: { versionNumber: 'desc' },
        select: { id: true },
    });
    const versionNumber = draft === null
        ? ((await tx.examVersion.aggregate({
            where: { examId: envelope.exam.id },
            _max: { versionNumber: true },
        }))._max.versionNumber ?? 0) + 1
        : undefined;
    const questions = envelope.questions.map((question) =>
        toExamVersionQuestionData(
            question,
            taxonomyNames.topicNamesBySlug,
            taxonomyNames.subtopicNamesBySlug,
        ),
    );
    const versionData = {
        publishProfile: envelope.publishProfile,
        title: envelope.exam.title,
        description: envelope.exam.description,
        durationMinutes: envelope.exam.durationMinutes,
        subject: envelope.exam.subject,
        difficulty: envelope.exam.difficulty,
        source: envelope.exam.source,
        year: envelope.exam.year,
        statusLabel: envelope.exam.statusLabel,
        scoringPolicy: 'vietnam_thpt_math_2025' as const,
        contentChecksum: buildContentChecksum(envelope),
    };

    if (draft !== null) {
        await tx.examVersion.update({
            where: { id: draft.id },
            data: {
                ...versionData,
                questions: {
                    deleteMany: {},
                    create: questions,
                },
            },
        });
        return;
    }

    await tx.examVersion.create({
        data: {
            ...versionData,
            examId: envelope.exam.id,
            versionNumber: versionNumber as number,
            questions: { create: questions },
        },
    });
}

type TaxonomyNames = {
    readonly topicNamesBySlug: ReadonlyMap<string, string>;
    readonly subtopicNamesBySlug: ReadonlyMap<string, string>;
};

async function readCanonicalTaxonomyNames(
    tx: Prisma.TransactionClient,
): Promise<TaxonomyNames> {
    const [topics, subtopics] = await Promise.all([
        tx.topic.findMany({
            where: { slug: { in: CANONICAL_TOPICS.map((topic) => topic.slug) } },
            select: { id: true, slug: true, name: true },
        }),
        tx.subtopic.findMany({
            where: { slug: { in: CANONICAL_SUBTOPICS.map((subtopic) => subtopic.slug) } },
            select: { slug: true, name: true, topic: { select: { slug: true } } },
        }),
    ]);
    const topicNamesBySlug = new Map(topics.map((topic) => [topic.slug, topic.name]));
    const subtopicNamesBySlug = new Map(subtopics.map((subtopic) => [subtopic.slug, subtopic.name]));

    const issues: string[] = [];
    for (const topic of CANONICAL_TOPICS) {
        if (topicNamesBySlug.get(topic.slug) !== topic.name) {
            issues.push(`missing or invalid canonical topic: ${topic.slug}`);
        }
    }
    for (const subtopic of CANONICAL_SUBTOPICS) {
        const persisted = subtopics.find((candidate) => candidate.slug === subtopic.slug);
        if (
            persisted === undefined ||
            persisted.name !== subtopic.name ||
            persisted.topic.slug !== subtopic.topicSlug
        ) {
            issues.push(`missing or invalid canonical subtopic: ${subtopic.slug}`);
        }
    }
    if (issues.length > 0) {
        throw new Error(`Canonical taxonomy is not synchronized: ${issues.join('; ')}`);
    }

    return { topicNamesBySlug, subtopicNamesBySlug };
}
