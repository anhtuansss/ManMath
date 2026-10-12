import { QuestionType } from '@prisma/client';
import { disconnectPrisma, prisma } from '../lib/prisma';

const TYPES: readonly QuestionType[] = ['single_choice', 'true_false_group', 'short_answer'];
type Counts = Record<QuestionType, number>;
const empty = (): Counts => ({ single_choice: 0, true_false_group: 0, short_answer: 0 });
const level = (total: number): 'EMPTY' | 'VERY_THIN' | 'THIN' | 'USABLE' | 'HEALTHY' => total === 0 ? 'EMPTY' : total <= 2 ? 'VERY_THIN' : total <= 4 ? 'THIN' : total <= 9 ? 'USABLE' : 'HEALTHY';

async function main(): Promise<void> {
  const [topics, published, draft, publishedVersions, draftVersions, allQuestions, publishedBankItems, draftBankItems] = await Promise.all([
    prisma.topic.findMany({ orderBy: [{ order: 'asc' }, { slug: 'asc' }], select: { slug: true, name: true, subtopics: { orderBy: { slug: 'asc' }, select: { slug: true, name: true } } } }),
    prisma.examVersionQuestion.groupBy({ by: ['topicSlug', 'subtopicSlug', 'type'], where: { examVersion: { status: 'published' } }, _count: { _all: true } }),
    prisma.examVersionQuestion.groupBy({ by: ['topicSlug', 'subtopicSlug', 'type'], where: { examVersion: { status: 'draft' } }, _count: { _all: true } }),
    prisma.examVersion.count({ where: { status: 'published' } }), prisma.examVersion.count({ where: { status: 'draft' } }),
    prisma.examVersionQuestion.findMany({ where: { examVersion: { status: 'published' } }, select: { topicSlug: true, subtopicSlug: true } }),
    prisma.questionBankItem.findMany({ where: { status: 'published' }, select: { type: true, topic: { select: { slug: true } }, subtopic: { select: { slug: true } } } }),
    prisma.questionBankItem.findMany({ where: { status: 'draft' }, select: { type: true, topic: { select: { slug: true } }, subtopic: { select: { slug: true } } } }),
  ]);
  const toMap = (rows: typeof published): Map<string, Counts> => { const result = new Map<string, Counts>(); for (const row of rows) { const key = `${row.topicSlug}\0${row.subtopicSlug ?? ''}`; const counts = result.get(key) ?? empty(); counts[row.type] = row._count._all; result.set(key, counts); } return result; };
  const p = toMap(published); const d = toMap(draft);
  const mergeBank = (target: Map<string, Counts>, rows: typeof publishedBankItems): void => { for (const item of rows) { const key = `${item.topic.slug}\0${item.subtopic.slug}`; const counts = target.get(key) ?? empty(); counts[item.type] += 1; target.set(key, counts); } };
  mergeBank(p, publishedBankItems); mergeBank(d, draftBankItems);
  const taxonomy = new Map(topics.map((topic) => [topic.slug, new Set(topic.subtopics.map((subtopic) => subtopic.slug))]));
  const anomalies = allQuestions.flatMap((question) => !taxonomy.has(question.topicSlug) ? [`unknown-topic:${question.topicSlug}`] : question.subtopicSlug !== null && !taxonomy.get(question.topicSlug)!.has(question.subtopicSlug) ? [`invalid-subtopic:${question.topicSlug}/${question.subtopicSlug}`] : []);
  const rows = topics.flatMap((topic) => topic.subtopics.map((subtopic) => { const counts = p.get(`${topic.slug}\0${subtopic.slug}`) ?? empty(); const draftCounts = d.get(`${topic.slug}\0${subtopic.slug}`) ?? empty(); const total = TYPES.reduce((sum, type) => sum + counts[type], 0); return { topic: topic.slug, subtopic: subtopic.slug, ...counts, total, coverageLevel: level(total), availableAt5: total >= 5, availableAt10: total >= 10, draft: { ...draftCounts, total: TYPES.reduce((sum, type) => sum + draftCounts[type], 0) } }; }));
  const typeTotals = TYPES.reduce((result, type) => ({ ...result, [type]: rows.reduce((sum, row) => sum + row[type], 0) }), {} as Counts);
  const levels = rows.reduce((result, row) => ({ ...result, [row.coverageLevel]: (result[row.coverageLevel] ?? 0) + 1 }), {} as Record<string, number>);
  console.log(JSON.stringify({ publishedExamVersions: publishedVersions, draftExamVersions: draftVersions, publishedQuestionBankItems: publishedBankItems.length, draftQuestionBankItems: draftBankItems.length, publishedQuestions: rows.reduce((sum, row) => sum + row.total, 0), draftQuestions: rows.reduce((sum, row) => sum + row.draft.total, 0), typeTotals, coverageLevels: levels, taxonomyAnomalies: [...new Set(anomalies)].sort(), rows }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(disconnectPrisma);
