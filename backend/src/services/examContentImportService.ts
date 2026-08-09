import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { ExamContentImportEnvelope } from '../scripts/importExamContentValidator';
import type { QuestionInput } from '../types/examContent';


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
    await prisma.$transaction(async (tx) => {
        await upsertExam(tx, envelope);

        const topicIdsBySlug = await upsertTopics(tx, envelope);
        const subtopicIdsBySlug = await upsertSubtopics(
            tx,
            envelope,
            topicIdsBySlug,
        );

        await prepareQuestionOrders(tx, envelope);

        await upsertQuestions(
            tx,
            envelope,
            topicIdsBySlug,
            subtopicIdsBySlug,
        );
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
            title: exam.title,
            description: exam.description,
            durationMinutes: exam.durationMinutes,
            subject: exam.subject,
            difficulty: exam.difficulty,
            source: exam.source,
            year: exam.year,
            statusLabel: exam.statusLabel,
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
