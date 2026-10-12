import { Prisma, QuestionBankItemStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import type { QuestionInput } from '../types/examContent';
import { validateQuestionInput } from '../types/examContentValidation';
import type { QuestionBankImportEnvelope, QuestionBankQuestionInput } from '../scripts/importQuestionBankValidator';

export class QuestionBankImportError extends Error {}
export class QuestionBankPublishError extends Error {
  readonly issues: readonly string[];
  constructor(message: string, issues: readonly string[] = []) { super(message); this.issues = issues; }
}

type TaxonomyIds = { readonly topicId: string; readonly subtopicId: string };

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

function provenanceFingerprint(envelope: QuestionBankImportEnvelope, item: QuestionBankQuestionInput): string {
  if (envelope.source.documentRef.startsWith('manmath-exam:')) {
    return examQuestionProvenanceFingerprint(envelope.source.documentRef.slice('manmath-exam:'.length), item.sourceQuestionRef ?? item.question.id);
  }
  return fingerprint({
    sourceName: envelope.source.name.trim().toLocaleLowerCase('vi'),
    sourceType: envelope.source.type,
    sourceYear: envelope.source.year,
    sourceDocumentRef: envelope.source.documentRef.trim().toLocaleLowerCase('vi'),
    sourceQuestionRef: item.sourceQuestionRef?.trim().toLocaleLowerCase('vi') ?? item.question.id,
  });
}

function questionFingerprint(question: QuestionInput): string {
  const { id: _id, order: _order, ...content } = question;
  return fingerprint(content);
}

export function examQuestionProvenanceFingerprint(examId: string, externalId: string): string {
  return fingerprint({ sourceType: 'manmath-exam', examId, externalId });
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function questionData(question: QuestionInput): Pick<Prisma.QuestionBankItemCreateInput, 'type' | 'section' | 'sourceOrder' | 'content' | 'assets' | 'choices' | 'statements' | 'answerKey'> {
  const base = {
    type: question.type,
    section: question.section,
    sourceOrder: question.order,
    content: question.content,
    assets: question.assets === undefined ? Prisma.DbNull : toJson(question.assets),
    answerKey: toJson(question.answerKey),
  };
  if (question.type === 'single_choice') return { ...base, choices: toJson(question.choices), statements: Prisma.DbNull };
  if (question.type === 'true_false_group') return { ...base, choices: Prisma.DbNull, statements: toJson(question.statements) };
  return { ...base, choices: Prisma.DbNull, statements: Prisma.DbNull };
}

async function taxonomyIds(envelope: QuestionBankImportEnvelope): Promise<TaxonomyIds> {
  const subtopic = await prisma.subtopic.findFirst({
    where: { slug: envelope.taxonomy.subtopicSlug, topic: { slug: envelope.taxonomy.topicSlug } },
    select: { id: true, topicId: true },
  });
  if (!subtopic) throw new QuestionBankImportError('Canonical taxonomy is not synchronized for this question bank batch');
  return { topicId: subtopic.topicId, subtopicId: subtopic.id };
}

export type QuestionBankImportResult = { readonly batchId: string; readonly draftItemCount: number; readonly createdRevisions: number; readonly reusedDrafts: number };

export async function importQuestionBank(envelope: QuestionBankImportEnvelope): Promise<QuestionBankImportResult> {
  const taxonomy = await taxonomyIds(envelope);
  return prisma.$transaction(async (tx) => {
    const existingBatch = await tx.questionBankImportBatch.findUnique({
      where: { externalId: envelope.id },
      include: { items: { select: { id: true, status: true } } },
    });
    if (existingBatch && existingBatch.items.some((item) => item.status !== 'draft')) {
      throw new QuestionBankImportError(`Question bank batch ${envelope.id} is immutable after publish`);
    }
    const batch = existingBatch ?? await tx.questionBankImportBatch.create({
      data: {
        externalId: envelope.id,
        title: envelope.title,
        sourceName: envelope.source.name,
        sourceType: envelope.source.type,
        sourceYear: envelope.source.year,
        sourceDocumentRef: envelope.source.documentRef,
      },
    });
    if (existingBatch) {
      await tx.questionBankImportBatch.update({
        where: { id: batch.id },
        data: { title: envelope.title, sourceName: envelope.source.name, sourceType: envelope.source.type, sourceYear: envelope.source.year, sourceDocumentRef: envelope.source.documentRef },
      });
    }

    let createdRevisions = 0;
    let reusedDrafts = 0;
    for (const item of envelope.questions) {
      const latest = await tx.questionBankItem.findFirst({
        where: { logicalKey: item.question.id },
        orderBy: { revision: 'desc' },
        select: { id: true, revision: true, status: true, importBatchId: true },
      });
      const data = {
        importBatchId: batch.id,
        topicId: taxonomy.topicId,
        subtopicId: taxonomy.subtopicId,
        sourceQuestionRef: item.sourceQuestionRef,
        assetSource: item.assetSource,
        provenanceFingerprint: provenanceFingerprint(envelope, item),
        contentFingerprint: questionFingerprint(item.question),
        ...questionData(item.question),
      };
      if (latest?.status === 'draft') {
        if (latest.importBatchId !== batch.id) throw new QuestionBankImportError(`Question ${item.question.id} already has a draft in another batch`);
        await tx.questionBankItem.update({ where: { id: latest.id }, data });
        reusedDrafts += 1;
        continue;
      }
      await tx.questionBankItem.create({ data: { logicalKey: item.question.id, revision: (latest?.revision ?? 0) + 1, status: 'draft', ...data } });
      createdRevisions += 1;
    }
    const draftItemCount = await tx.questionBankItem.count({ where: { importBatchId: batch.id, status: 'draft' } });
    return { batchId: batch.id, draftItemCount, createdRevisions, reusedDrafts };
  });
}

type PersistedBankQuestion = {
  logicalKey: string; type: QuestionInput['type']; section: number; sourceOrder: number; content: string;
  topic: { slug: string }; subtopic: { slug: string }; assets: Prisma.JsonValue | null; choices: Prisma.JsonValue | null; statements: Prisma.JsonValue | null; answerKey: Prisma.JsonValue;
};

export function questionBankItemToQuestion(record: PersistedBankQuestion): QuestionInput {
  const parsed = validateQuestionInput({
    id: record.logicalKey,
    type: record.type,
    section: record.section,
    order: record.sourceOrder,
    content: record.content,
    topicSlug: record.topic.slug,
    subtopicSlug: record.subtopic.slug,
    ...(record.assets === null ? {} : { assets: record.assets }),
    ...(record.choices === null ? {} : { choices: record.choices }),
    ...(record.statements === null ? {} : { statements: record.statements }),
    answerKey: record.answerKey,
  });
  if (!parsed.ok) throw new QuestionBankPublishError(`Question bank item ${record.logicalKey} is invalid`, [parsed.message]);
  return parsed.value;
}

export async function publishQuestionBankBatch(externalId: string): Promise<{ batchId: string; publishedItemCount: number }> {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.questionBankImportBatch.findUnique({
      where: { externalId },
      include: { items: { where: { status: 'draft' }, include: { topic: { select: { slug: true } }, subtopic: { select: { slug: true } } } } },
    });
    if (!batch) throw new QuestionBankPublishError(`Question bank batch ${externalId} was not found`);
    if (batch.items.length === 0) throw new QuestionBankPublishError(`Question bank batch ${externalId} has no draft items`);
    const issues: string[] = [];
    for (const item of batch.items) {
      try { questionBankItemToQuestion(item); } catch (error) { issues.push(error instanceof Error ? error.message : String(error)); }
    }
    if (issues.length > 0) throw new QuestionBankPublishError('Question bank draft is invalid', issues);
    for (const item of batch.items) {
      await tx.questionBankItem.updateMany({ where: { logicalKey: item.logicalKey, status: 'published' }, data: { status: 'archived' } });
      await tx.questionBankItem.update({ where: { id: item.id }, data: { status: 'published' } });
    }
    return { batchId: batch.id, publishedItemCount: batch.items.length };
  });
}

export { provenanceFingerprint, questionFingerprint };
