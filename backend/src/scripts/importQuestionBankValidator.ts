import {
  getCanonicalSubtopic,
  getCanonicalTopic,
} from '../data/canonicalTaxonomy';
import type { QuestionInput } from '../types/examContent';
import { isRecord, validateQuestionInput } from '../types/examContentValidation';

export type QuestionBankSourceType = 'official' | 'mock' | 'curated';

export type QuestionBankSourceInput = {
  readonly name: string;
  readonly type: QuestionBankSourceType;
  readonly year: number | null;
  readonly documentRef: string;
};

export type QuestionBankTaxonomyInput = {
  readonly topicSlug: string;
  readonly subtopicSlug: string;
};

export type QuestionBankQuestionInput = {
  readonly question: QuestionInput;
  readonly sourceQuestionRef: string | null;
  readonly assetSource: string | null;
};

export type QuestionBankImportEnvelope = {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly source: QuestionBankSourceInput;
  readonly taxonomy: QuestionBankTaxonomyInput;
  readonly questions: readonly QuestionBankQuestionInput[];
};

export class QuestionBankImportValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super('Question bank import validation failed');
    this.issues = issues;
  }
}

function requiredString(value: unknown, path: string, issues: string[]): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push(`${path} must be a non-empty string`);
    return null;
  }
  return value.trim();
}

function optionalString(value: unknown, path: string, issues: string[]): string | null {
  if (value === undefined || value === null) return null;
  return requiredString(value, path, issues);
}

function source(value: unknown, issues: string[]): QuestionBankSourceInput | null {
  if (!isRecord(value)) {
    issues.push('source must be an object');
    return null;
  }
  const name = requiredString(value.name, 'source.name', issues);
  const documentRef = requiredString(value.documentRef, 'source.documentRef', issues);
  const type = value.type === 'official' || value.type === 'mock' || value.type === 'curated'
    ? value.type
    : null;
  if (type === null) issues.push('source.type must be official, mock, or curated');
  const year = value.year === undefined || value.year === null
    ? null
    : typeof value.year === 'number' && Number.isInteger(value.year) && value.year >= 1900 && value.year <= 2100
      ? value.year
      : null;
  if (value.year !== undefined && value.year !== null && year === null) issues.push('source.year must be an integer between 1900 and 2100');
  return name !== null && documentRef !== null && type !== null ? { name, type, year, documentRef } : null;
}

function taxonomy(value: unknown, issues: string[]): QuestionBankTaxonomyInput | null {
  if (!isRecord(value)) {
    issues.push('taxonomy must be an object');
    return null;
  }
  const topicSlug = requiredString(value.topicSlug, 'taxonomy.topicSlug', issues);
  const subtopicSlug = requiredString(value.subtopicSlug, 'taxonomy.subtopicSlug', issues);
  if (topicSlug === null || subtopicSlug === null) return null;
  const topic = getCanonicalTopic(topicSlug);
  const subtopic = getCanonicalSubtopic(subtopicSlug);
  if (topic === undefined) issues.push(`taxonomy.topicSlug is not canonical: ${topicSlug}`);
  if (subtopic === undefined) issues.push(`taxonomy.subtopicSlug is not canonical: ${subtopicSlug}`);
  if (topic !== undefined && subtopic !== undefined && subtopic.topicSlug !== topic.slug) {
    issues.push(`taxonomy.subtopicSlug does not belong to taxonomy.topicSlug: ${subtopicSlug}`);
  }
  return topic !== undefined && subtopic !== undefined && subtopic.topicSlug === topic.slug
    ? { topicSlug, subtopicSlug }
    : null;
}

function questions(value: unknown, expectedTaxonomy: QuestionBankTaxonomyInput | null, issues: string[]): readonly QuestionBankQuestionInput[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push('questions must be a non-empty array');
    return null;
  }
  const values: QuestionBankQuestionInput[] = [];
  const keys = new Set<string>();
  for (const [index, raw] of value.entries()) {
    const path = `questions[${index}]`;
    if (!isRecord(raw)) {
      issues.push(`${path} must be an object`);
      continue;
    }
    const parsed = validateQuestionInput(raw);
    if (!parsed.ok) {
      issues.push(`${path} ${parsed.message}`);
      continue;
    }
    if (expectedTaxonomy !== null && (parsed.value.topicSlug !== expectedTaxonomy.topicSlug || parsed.value.subtopicSlug !== expectedTaxonomy.subtopicSlug)) {
      issues.push(`${path} taxonomy must match the batch taxonomy`);
      continue;
    }
    if (keys.has(parsed.value.id)) {
      issues.push(`${path}.id is duplicated: ${parsed.value.id}`);
      continue;
    }
    keys.add(parsed.value.id);
    const sourceQuestionRef = optionalString(raw.sourceQuestionRef, `${path}.sourceQuestionRef`, issues);
    const assetSource = optionalString(raw.assetSource, `${path}.assetSource`, issues);
    values.push({ question: parsed.value, sourceQuestionRef, assetSource });
  }
  return values;
}

export function validateQuestionBankImportPayload(raw: unknown): QuestionBankImportEnvelope {
  const issues: string[] = [];
  if (!isRecord(raw)) throw new QuestionBankImportValidationError(['root must be an object']);
  if (raw.schemaVersion !== 1) issues.push('schemaVersion must be 1');
  const id = requiredString(raw.id, 'id', issues);
  const title = requiredString(raw.title, 'title', issues);
  const parsedSource = source(raw.source, issues);
  const parsedTaxonomy = taxonomy(raw.taxonomy, issues);
  const parsedQuestions = questions(raw.questions, parsedTaxonomy, issues);
  if (issues.length > 0 || id === null || title === null || parsedSource === null || parsedTaxonomy === null || parsedQuestions === null) {
    throw new QuestionBankImportValidationError(issues);
  }
  return { schemaVersion: 1, id, title, source: parsedSource, taxonomy: parsedTaxonomy, questions: parsedQuestions };
}
