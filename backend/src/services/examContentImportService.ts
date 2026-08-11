import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import type { ExamContentImportEnvelope } from '../scripts/importExamContentValidator';
import type { QuestionInput } from '../types/examContent';
import { validateExamPublishReadiness } from './examPublishReadinessService';


type QuestionStorageData = {
    readonly order: number;
    readonly question: string;
    readonly imageUrl: string | null;
    readonly explanation: string | null;
    readonly options: string[];
    readonly optionImageUrls: string[];
    readonly correctAnswer: string | null;
    readonly externalId: string;
    readonly type: QuestionInput['type'];
    readonly section: number;
    readonly assets: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    readonly choices: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    readonly statements: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue;
    readonly answerKey: Prisma.InputJsonValue;
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toQuestionStorageData(
    question: QuestionInput,
): QuestionStorageData {
    const sharedData = {
        order: question.order,
        question: question.content,
        imageUrl: null,
        explanation: null,
        optionImageUrls: [],
        externalId: question.id,
        type: question.type,
        section: question.section,
        assets:
        question.assets === undefined
            ? Prisma.DbNull
            : toJsonValue(question.assets),
        answerKey: toJsonValue(question.answerKey),
    };

    switch (question.type) {
        case 'single_choice': {
        const correctChoice = question.choices.find(
            (choice) => choice.id === question.answerKey.correctChoiceId,
        );

        if (correctChoice === undefined) {
            throw new Error(
            `Validated single-choice question ${question.id} has no matching correct choice`,
            );
        }

        return {
            ...sharedData,
            options: question.choices.map((choice) => choice.content),
            correctAnswer: correctChoice.content,
            choices: toJsonValue(question.choices),
            statements: Prisma.DbNull,
        };
        }

        case 'true_false_group':
        return {
            ...sharedData,
            options: [],
            correctAnswer: null,
            choices: Prisma.DbNull,
            statements: toJsonValue(question.statements),
        };

        case 'short_answer':
        return {
            ...sharedData,
            options: [],
            correctAnswer: null,
            choices: Prisma.DbNull,
            statements: Prisma.DbNull,
        };
    }
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

        const topicIdsBySlug = await upsertTopics(tx, envelope);
        await upsertSubtopics(tx, envelope, topicIdsBySlug);
        await upsertDraftExamVersion(tx, envelope);
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
        update: {
            contentEngine: 'v2',
        },
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
            contentEngine: 'v2',
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
    const topicNamesBySlug = new Map(
        envelope.taxonomy.topics.map((topic) => [topic.slug, topic.name]),
    );
    const subtopicNamesBySlug = new Map(
        envelope.taxonomy.subtopics.map((subtopic) => [subtopic.slug, subtopic.name]),
    );
    const questions = envelope.questions.map((question) =>
        toExamVersionQuestionData(question, topicNamesBySlug, subtopicNamesBySlug),
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

async function upsertTopics(
    tx: Prisma.TransactionClient,
    envelope: ExamContentImportEnvelope,
): Promise<Map<string, string>> {
    const topicIdsBySlug = new Map<string, string>();

    for (const topic of envelope.taxonomy.topics) {
        const upsertedTopic = await tx.topic.upsert({
            where: {
                slug: topic.slug,
            },
            update: {
                name: topic.name,
            },
            create: {
                name: topic.name,
                slug: topic.slug,
            },
        });

        topicIdsBySlug.set(topic.slug, upsertedTopic.id);
    }

    return topicIdsBySlug;
}

async function upsertSubtopics(
    tx: Prisma.TransactionClient,
    envelope: ExamContentImportEnvelope,
    topicIdsBySlug: ReadonlyMap<string, string>,
): Promise<Map<string, string>> {
    const subtopicIdsBySlug = new Map<string, string>();

    for (const subtopic of envelope.taxonomy.subtopics) {
        const topicId = topicIdsBySlug.get(subtopic.topicSlug);

        if (topicId === undefined) {
            throw new Error(
                `Validated subtopic ${subtopic.slug} references missing topic ${subtopic.topicSlug}`,
            );
        }

        const upsertedSubtopic = await tx.subtopic.upsert({
            where: {
                slug: subtopic.slug,
            },
            update: {
                name: subtopic.name,
                topicId,
            },
            create: {
                name: subtopic.name,
                slug: subtopic.slug,
                topicId,
            },
        });

        subtopicIdsBySlug.set(subtopic.slug, upsertedSubtopic.id);
    }

    return subtopicIdsBySlug;
}

async function prepareQuestionOrders(
    tx: Prisma.TransactionClient,
    envelope: ExamContentImportEnvelope,
): Promise<void> {
    const existingQuestions = await tx.question.findMany({
        where: {
            examId: envelope.exam.id,
        },
        select: {
            id: true,
            externalId: true,
            order: true,
        },
    });

    const incomingExternalIds = new Set<string>(
        envelope.questions.map((question) => question.id),
    );
    const incomingOrders = new Set(
        envelope.questions.map((question) => question.order),
    );

    for (const existingQuestion of existingQuestions) {
        const isUpdatedByImport =
            existingQuestion.externalId !== null &&
            incomingExternalIds.has(existingQuestion.externalId);

        if (!isUpdatedByImport && incomingOrders.has(existingQuestion.order)) {
            throw new Error(
                `Question order ${existingQuestion.order} is occupied by existing question ${existingQuestion.id} outside this import`,
            );
        }
    }

    const highestExistingOrder = existingQuestions.reduce(
        (highestOrder, question) => Math.max(highestOrder, question.order),
        -1,
    );
    const questionsUpdatedByImport = existingQuestions.filter(
        (question) =>
            question.externalId !== null &&
            incomingExternalIds.has(question.externalId),
    );

    for (const [index, question] of questionsUpdatedByImport.entries()) {
        await tx.question.update({
            where: {
                id: question.id,
            },
            data: {
                order: highestExistingOrder + index + 1,
            },
        });
    }
}

async function upsertQuestions(
    tx: Prisma.TransactionClient,
    envelope: ExamContentImportEnvelope,
    topicIdsBySlug: ReadonlyMap<string, string>,
    subtopicIdsBySlug: ReadonlyMap<string, string>,
): Promise<void> {
    for (const question of envelope.questions) {
        const topicId = topicIdsBySlug.get(question.topicSlug);

        if (topicId === undefined) {
            throw new Error(
                `Validated question ${question.id} references missing topic ${question.topicSlug}`,
            );
        }

        const subtopicId =
            question.subtopicSlug === undefined
                ? null
                : subtopicIdsBySlug.get(question.subtopicSlug);

        if (
            question.subtopicSlug !== undefined &&
            subtopicId === undefined
        ) {
            throw new Error(
                `Validated question ${question.id} references missing subtopic ${question.subtopicSlug}`,
            );
        }

        const storageData = toQuestionStorageData(question);

        await tx.question.upsert({
            where: {
                examId_externalId: {
                    examId: envelope.exam.id,
                    externalId: storageData.externalId,
                },
            },
            update: {
                order: storageData.order,
                topicId,
                subtopicId,
                question: storageData.question,
                imageUrl: storageData.imageUrl,
                explanation: storageData.explanation,
                options: storageData.options,
                optionImageUrls: storageData.optionImageUrls,
                correctAnswer: storageData.correctAnswer,
                type: storageData.type,
                section: storageData.section,
                assets: storageData.assets,
                choices: storageData.choices,
                statements: storageData.statements,
                answerKey: storageData.answerKey,
            },
            create: {
                examId: envelope.exam.id,
                topicId,
                subtopicId,
                ...storageData,
            },
        });
    }
}
