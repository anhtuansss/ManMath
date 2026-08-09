import type { ExamDifficulty } from '@prisma/client';
import type { QuestionInput } from '../types/examContent';
import {
  isRecord,
  validateQuestionInput,
} from '../types/examContentValidation';

export type ImportTopicInput = {
  readonly name: string;
  readonly slug: string;
};

export type ImportSubtopicInput = {
  readonly name: string;
  readonly slug: string;
  readonly topicSlug: string;
};

export type ImportExamMetadata = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly subject: string;
  readonly difficulty: ExamDifficulty;
  readonly source: string | null;
  readonly year: number | null;
  readonly statusLabel: string;
};

export type ImportTaxonomyInput = {
  readonly topics: readonly ImportTopicInput[];
  readonly subtopics: readonly ImportSubtopicInput[];
};

export type ExamContentImportEnvelope = {
  readonly schemaVersion: 2;
  readonly exam: ImportExamMetadata;
  readonly taxonomy: ImportTaxonomyInput;
  readonly questions: readonly QuestionInput[];
};

export class ExamContentImportValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super('Exam content import validation failed');
    this.name = 'ExamContentImportValidationError';
    this.issues = issues;
  }
}

const TAXONOMY_SLUG_PATTERN = /^[a-z0-9-]+$/;

export function validateExamContentImportPayload(
  rawValue: unknown,
): ExamContentImportEnvelope {
    const issues: string[] = [];

    if(!isRecord(rawValue)) {
        throw new ExamContentImportValidationError([
            'root must be an object',
        ]);
    }

    if (rawValue.schemaVersion !== 2) {
        issues.push('schemaVersion must be 2');
    }

    const exam = normalizeExamMetadata(
        rawValue.exam,
        'exam',
        issues,
    );

    const taxonomy = normalizeTaxonomy(
        rawValue.taxonomy,
        'taxonomy',
        issues,
    );

    const questions = normalizeQuestions(
        rawValue.questions,
        'questions',
        issues,
    );

    if (
        issues.length > 0 ||
        exam === null || 
        taxonomy === null || 
        questions === null 
    ) {
        throw new ExamContentImportValidationError(issues);
    }

    validateTaxonomyReferences(
        taxonomy,
        questions,
        issues,
    );

    if (issues.length > 0) {
        throw new ExamContentImportValidationError(issues);
    }

    return {
        schemaVersion: 2,
        exam,
        taxonomy,
        questions,
    };
}

function readRequiredString(
    value: unknown,
    path: string,
    issues: string[],
): string | null {
    if (typeof value !== 'string' || value.trim().length === 0) {
        issues.push(`${path} must be a non-empty string`);
        return null;
    }

    return value.trim();
}

function readPositiveInteger(
    value: unknown,
    path: string,
    issues: string[],
): number | null {
    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value <= 0
    ) {
        issues.push(`${path} must be a positive integer`);
        return null;
    }

    return value;
}

function readExamDifficulty(
    value: unknown,
    path: string,
    issues: string[],
): ExamDifficulty | null {
    if (
        value !== 'easy' &&
        value !== 'medium' &&
        value !== 'hard'
    ) {
        issues.push(
        `${path} must be one of: easy, medium, hard`,
        );
        return null;
    }

    return value;
}

function readNullableString(
    value: unknown,
    path: string,
    issues: string[],
): string | null | undefined {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
        issues.push(`${path} must be a non-empty string or null`);
        return undefined;
    }

    return value.trim();
}

function readNullableYear(
    value: unknown,
    path: string,
    issues: string[],
): number | null | undefined {
    if (value === undefined || value === null) {
        return null;
    }

    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < 1900 ||
        value > 2100
    ) {
        issues.push(`${path} must be an integer from 1900 to 2100 or null`);
        return undefined;
    }

    return value;
}

function normalizeExamMetadata(
    value: unknown,
    path: string,
    issues: string[],
): ImportExamMetadata | null {
    if (!isRecord(value)) {
        issues.push(`${path} must be an object`);
        return null;
    }

    const id = readRequiredString(value.id, `${path}.id`, issues);
    const title = readRequiredString(value.title, `${path}.title`, issues);
    const description = readRequiredString(
        value.description,
        `${path}.description`,
        issues,
    );
    const subject = readRequiredString(
        value.subject,
        `${path}.subject`,
        issues,
    );
    const statusLabel = readRequiredString(
        value.statusLabel,
        `${path}.statusLabel`,
        issues,
    );

    const durationMinutes = readPositiveInteger(
        value.durationMinutes,
        `${path}.durationMinutes`,
        issues,
    );

    const difficulty = readExamDifficulty(
        value.difficulty,
        `${path}.difficulty`,
        issues,
    );

    const source = readNullableString(value.source, `${path}.source`, issues);
    const year = readNullableYear(value.year, `${path}.year`, issues);

    if (
        id === null ||
        title === null ||
        description === null ||
        subject === null ||
        statusLabel === null ||
        durationMinutes === null ||
        difficulty === null ||
        source === undefined ||
        year === undefined
    ) {
        return null;
    }

    return {
        id,
        title,
        description,
        durationMinutes,
        subject,
        difficulty,
        source,
        year,
        statusLabel,
    };
}

function readSlug(
    value: unknown,
    path: string,
    issues: string[],
): string | null {
    const slug = readRequiredString(value, path, issues);

    if (slug === null) {
        return null;
    }

    if (!TAXONOMY_SLUG_PATTERN.test(slug)) {
        issues.push(
            `${path} must contain only lowercase letters, numbers, and hyphens`,
        );
        return null;
    }

    return slug;
}

function normalizeTopic(
    value: unknown,
    path: string,
    issues: string[],
): ImportTopicInput | null {
    if (!isRecord(value)) {
        issues.push(`${path} must be an object`);
        return null;
    }

    const name = readRequiredString(value.name, `${path}.name`, issues);
    const slug = readSlug(value.slug, `${path}.slug`, issues);

    if (name === null || slug === null) {
        return null;
    }

    return { name, slug };
}

function normalizeSubtopic(
    value: unknown,
    path: string,
    issues: string[],
): ImportSubtopicInput | null {
    if (!isRecord(value)) {
        issues.push(`${path} must be an object`);
        return null;
    }

    const name = readRequiredString(value.name, `${path}.name`, issues);
    const slug = readSlug(value.slug, `${path}.slug`, issues);
    const topicSlug = readSlug(value.topicSlug, `${path}.topicSlug`, issues);

    if (name === null || slug === null || topicSlug === null) {
        return null;
    }

    return { name, slug, topicSlug };
}

function normalizeTopics(
    value: unknown,
    path: string,
    issues: string[],
): ImportTopicInput[] | null {
    if (!Array.isArray(value) || value.length === 0) {
        issues.push(`${path} must be a non-empty array`);
        return null;
    }

    const topics: ImportTopicInput[] = [];
    let hasInvalidTopic = false;

    for (const [index, item] of value.entries()) {
        const topic = normalizeTopic(item, `${path}[${index}]`, issues);

        if (topic === null) {
            hasInvalidTopic = true;
            continue;
        }

        topics.push(topic);
    }

    return hasInvalidTopic ? null : topics;
}

function normalizeSubtopics(
    value: unknown,
    path: string,
    issues: string[],
): ImportSubtopicInput[] | null {
    if (!Array.isArray(value)) {
        issues.push(`${path} must be an array`);
        return null;
    }

    const subtopics: ImportSubtopicInput[] = [];
    let hasInvalidSubtopic = false;

    for (const [index, item] of value.entries()) {
        const subtopic = normalizeSubtopic(item, `${path}[${index}]`, issues);

        if (subtopic === null) {
            hasInvalidSubtopic = true;
            continue;
        }

        subtopics.push(subtopic);
    }

    return hasInvalidSubtopic ? null : subtopics;
}

function normalizeTaxonomy(
    value: unknown,
    path: string,
    issues: string[],
): ImportTaxonomyInput | null {
    if (!isRecord(value)) {
        issues.push(`${path} must be an object`);
        return null;
    }

    const topics = normalizeTopics(value.topics, `${path}.topics`, issues);
    const subtopics = normalizeSubtopics(
        value.subtopics,
        `${path}.subtopics`,
        issues,
    );

    if (topics === null || subtopics === null) {
        return null;
    }

    return { topics, subtopics };
}

function normalizeQuestions(
    value: unknown,
    path: string,
    issues: string[],
): QuestionInput[] | null {
    if (!Array.isArray(value) || value.length === 0) {
        issues.push(`${path} must be a non-empty array`);
        return null;
    }

    const questions: QuestionInput[] = [];
    let hasInvalidQuestion = false;

    for (const [index, item] of value.entries()) {
        const result = validateQuestionInput(item);

        if (!result.ok) {
            issues.push(`${path}[${index}] ${result.message}`);
            hasInvalidQuestion = true;
            continue;
        }

        questions.push(result.value);
    }

    return hasInvalidQuestion ? null : questions;
}

function validateTaxonomyReferences(
    taxonomy: ImportTaxonomyInput,
    questions: readonly QuestionInput[],
    issues: string[],
): void {
    const topicSlugs = new Set<string>();
    const subtopicBySlug = new Map<string, ImportSubtopicInput>();
    const questionIds = new Set<string>();
    const questionOrders = new Set<number>();

    for (const topic of taxonomy.topics) {
        if (topicSlugs.has(topic.slug)) {
            issues.push(`taxonomy.topics contains duplicate slug: ${topic.slug}`);
        }

        topicSlugs.add(topic.slug);
    }

    for (const subtopic of taxonomy.subtopics) {
        if (subtopicBySlug.has(subtopic.slug)) {
            issues.push(
                `taxonomy.subtopics contains duplicate slug: ${subtopic.slug}`,
            );
        }

        if (!topicSlugs.has(subtopic.topicSlug)) {
            issues.push(
                `taxonomy.subtopics slug ${subtopic.slug} references unknown topic: ${subtopic.topicSlug}`,
            );
        }

        subtopicBySlug.set(subtopic.slug, subtopic);
    }

    for (const question of questions) {
        if (questionIds.has(question.id)) {
            issues.push(`questions contains duplicate id: ${question.id}`);
        }

        questionIds.add(question.id);

        if (questionOrders.has(question.order)) {
            issues.push(`questions contains duplicate order: ${question.order}`);
        }

        questionOrders.add(question.order);

        if (!topicSlugs.has(question.topicSlug)) {
            issues.push(
                `question ${question.id} references unknown topic: ${question.topicSlug}`,
            );
        }

        if (question.subtopicSlug === undefined) {
            continue;
        }

        const subtopic = subtopicBySlug.get(question.subtopicSlug);

        if (subtopic === undefined) {
            issues.push(
                `question ${question.id} references unknown subtopic: ${question.subtopicSlug}`,
            );
            continue;
        }

        if (subtopic.topicSlug !== question.topicSlug) {
            issues.push(
                `question ${question.id} subtopic ${question.subtopicSlug} does not belong to topic ${question.topicSlug}`,
            );
        }
    }
}