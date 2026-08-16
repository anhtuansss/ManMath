import { prisma } from '../lib/prisma';
import type { ExamDifficulty, ExamSummaryDto, TopicFilterDto } from '../types/exam';

export type GetExamSummariesFilters = { search?: string; topic?: string; subtopic?: string; durationMin?: number; durationMax?: number; difficulty?: ExamDifficulty; source?: string; year?: number };
const normalize = (value: string): string => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Discovery only exposes the latest published V2 version of each logical exam. */
export const getExamSummaries = async (filters?: GetExamSummariesFilters): Promise<ExamSummaryDto[]> => {
  const exams = await prisma.exam.findMany({ where: { versions: { some: { status: 'published' } } }, orderBy: { createdAt: 'desc' }, select: { id: true, versions: { where: { status: 'published' }, take: 1, orderBy: { versionNumber: 'desc' }, select: { title: true, description: true, durationMinutes: true, subject: true, difficulty: true, source: true, year: true, statusLabel: true, _count: { select: { questions: true } }, questions: { select: { topicSlug: true, subtopicSlug: true } } } } } });
  return exams.flatMap((exam) => {
    const version = exam.versions[0]; if (!version) return [];
    const item: ExamSummaryDto = { id: exam.id, title: version.title, description: version.description, durationMinutes: version.durationMinutes, totalQuestions: version._count.questions, subject: version.subject, difficulty: version.difficulty, source: version.source, year: version.year ?? undefined, statusLabel: version.statusLabel };
    const ok = (!filters?.search || normalize(`${item.title} ${item.description}`).includes(normalize(filters.search.trim()))) && (!filters?.topic || version.questions.some((q) => q.topicSlug === filters.topic!.trim())) && (!filters?.subtopic || version.questions.some((q) => q.subtopicSlug === filters.subtopic!.trim())) && (filters?.durationMin === undefined || item.durationMinutes >= filters.durationMin) && (filters?.durationMax === undefined || item.durationMinutes <= filters.durationMax) && (!filters?.difficulty || item.difficulty === filters.difficulty) && (!filters?.source || (item.source ?? '').toLocaleLowerCase('vi').includes(filters.source.toLocaleLowerCase('vi'))) && (filters?.year === undefined || item.year === filters.year);
    return ok ? [item] : [];
  });
};

export const getTopicFilters = async (): Promise<TopicFilterDto[]> => (await prisma.topic.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true, subtopics: { orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } } } })).map((topic) => topic);
