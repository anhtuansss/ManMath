import { prisma } from '../lib/prisma';
import { getUserAnalyticsFacts, type AnalyticsFact, type AnalyticsCoverageDto } from './analyticsFactsService';

export type LearningConfidence = 'insufficient' | 'low' | 'usable';
export type LearningStatus = 'insufficient_data' | 'developing' | 'proficient' | 'strong';
export type CorpusStatus = 'available' | 'insufficient';

export type LearningAggregateDto = {
  topicSlug: string; topicName: string; subtopicSlug: string | null; subtopicName: string | null;
  answeredCount: number; fullyCorrectCount: number; earnedScoreUnits: number; maxScoreUnits: number;
  masteryPercent: number | null; confidence: LearningConfidence; status: LearningStatus;
  isWeak: boolean; examQuestionCount: number; practiceQuestionCount: number;
  lastPracticedAt: string | null; corpusAvailableQuestionCount: number; corpusStatus: CorpusStatus;
};
export type PracticeRecommendationDto = {
  topicSlug: string; subtopicSlug: string; title: string; reason: string;
  corpusAvailableQuestionCount: number; kind: 'needs_practice' | 'assess' | 'starter';
};
export type RecentLearningActivityDto = {
  sourceType: 'exam' | 'practice'; id: string; title: string; completedAt: string;
  earnedScoreUnits: number; maxScoreUnits: number; fullyCorrectCount: number; totalQuestions: number;
};
export type ContinueLearningItemDto = { sourceType: 'practice'; sessionId: string; title: string; topicSlug: string; subtopicSlug: string | null; startedAt: string };
export type LearningOverviewDto = {
  overall: Omit<LearningAggregateDto, 'topicSlug' | 'topicName' | 'subtopicSlug' | 'subtopicName' | 'corpusAvailableQuestionCount' | 'corpusStatus'>;
  topics: LearningAggregateDto[]; subtopics: LearningAggregateDto[];
  recentActivity: RecentLearningActivityDto[]; continueItems: ContinueLearningItemDto[];
  nextAction: PracticeRecommendationDto | null; coverage: AnalyticsCoverageDto & { examFactCount: number; practiceFactCount: number };
};

const TIER_A_STARTER_SUBTOPICS = [
  'bai-toan-tham-so-don-dieu-cuc-tri-tuong-giao', 'phuong-phap-tinh-nguyen-ham',
  'phuong-phap-tinh-tich-phan', 'phep-chieu-song-song-va-phep-chieu-vuong-goc',
  'goc-trong-oxyz', 'vi-tri-tuong-doi', 'nhi-thuc-newton',
  'doc-phan-tich-va-ket-luan-tu-so-lieu', 'mau-so-lieu-khong-ghep-nhom',
] as const;
const pct = (earned: number, max: number): number | null => max > 0 ? Math.round((earned / max) * 100) : null;
const confidence = (answered: number): LearningConfidence => answered <= 2 ? 'insufficient' : answered <= 4 ? 'low' : 'usable';
const status = (answered: number, mastery: number | null): LearningStatus => {
  if (answered <= 2) return 'insufficient_data';
  if (answered <= 4 || mastery === null || mastery < 60) return 'developing';
  return mastery < 85 ? 'proficient' : 'strong';
};

type Counter = { answered: number; correct: number; earned: number; max: number; exam: number; practice: number; last: Date | null };
const add = (target: Counter, fact: AnalyticsFact): void => {
  target.earned += fact.awardedScoreUnits; target.max += fact.maxScoreUnits;
  if (fact.isAnswered) target.answered += 1;
  if (fact.isFullyCorrect) target.correct += 1;
  if (fact.sourceType === 'exam') target.exam += 1; else target.practice += 1;
  if (target.last === null || target.last < fact.submittedAt) target.last = fact.submittedAt;
};
const empty = (): Counter => ({ answered: 0, correct: 0, earned: 0, max: 0, exam: 0, practice: 0, last: null });

async function corpusCounts(): Promise<Map<string, number>> {
  const [examRows, bankRows] = await Promise.all([
    prisma.examVersionQuestion.groupBy({ by: ['subtopicSlug'], where: { subtopicSlug: { not: null }, examVersion: { status: 'published' } }, _count: { _all: true } }),
    prisma.questionBankItem.groupBy({ by: ['subtopicId'], where: { status: 'published' }, _count: { _all: true } }),
  ]);
  const subtopics = bankRows.length === 0 ? [] : await prisma.subtopic.findMany({ where: { id: { in: bankRows.map((row) => row.subtopicId) } }, select: { id: true, slug: true } });
  const slugById = new Map(subtopics.map((row) => [row.id, row.slug]));
  const result = new Map<string, number>();
  for (const row of examRows) if (row.subtopicSlug !== null) result.set(row.subtopicSlug, row._count._all);
  for (const row of bankRows) { const slug = slugById.get(row.subtopicId); if (slug) result.set(slug, (result.get(slug) ?? 0) + row._count._all); }
  return result;
}

function aggregate(params: { facts: readonly AnalyticsFact[]; topicSlug: string; topicName: string; subtopicSlug: string | null; subtopicName: string | null; available: number }): LearningAggregateDto {
  const c = empty(); params.facts.forEach((fact) => add(c, fact));
  const mastery = pct(c.earned, c.max); const level = confidence(c.answered); const learningStatus = status(c.answered, mastery);
  return { topicSlug: params.topicSlug, topicName: params.topicName, subtopicSlug: params.subtopicSlug, subtopicName: params.subtopicName, answeredCount: c.answered, fullyCorrectCount: c.correct, earnedScoreUnits: c.earned, maxScoreUnits: c.max, masteryPercent: mastery, confidence: level, status: learningStatus, isWeak: level === 'usable' && mastery !== null && mastery < 60, examQuestionCount: c.exam, practiceQuestionCount: c.practice, lastPracticedAt: c.last?.toISOString() ?? null, corpusAvailableQuestionCount: params.available, corpusStatus: params.available >= 5 ? 'available' : 'insufficient' };
}

export async function getLearningOverview(userId: string): Promise<LearningOverviewDto> {
  const [{ facts, coverage }, topics, counts, recentExams, recentPractice, active] = await Promise.all([
    getUserAnalyticsFacts(userId),
    prisma.topic.findMany({ orderBy: [{ order: 'asc' }, { slug: 'asc' }], select: { slug: true, name: true, subtopics: { select: { slug: true, name: true } } } }),
    corpusCounts(),
    prisma.attempt.findMany({ where: { userId, scoringPolicy: 'vietnam_thpt_math_2025' }, orderBy: { submittedAt: 'desc' }, take: 5, select: { id: true, submittedAt: true, scoreUnits: true, maxScoreUnits: true, correctCount: true, totalQuestions: true, exam: { select: { title: true } } } }),
    prisma.practiceSession.findMany({ where: { userId, status: 'completed' }, orderBy: { submittedAt: 'desc' }, take: 5, select: { id: true, submittedAt: true, scoreUnits: true, maxScoreUnits: true, fullyCorrectCount: true, totalQuestions: true, topic: { select: { name: true } }, subtopic: { select: { name: true } } } }),
    prisma.practiceSession.findMany({ where: { userId, status: 'in_progress' }, orderBy: { startedAt: 'desc' }, select: { id: true, startedAt: true, topic: { select: { slug: true, name: true } }, subtopic: { select: { slug: true } } } }),
  ]);
  const byTopic = new Map<string, AnalyticsFact[]>(); const bySubtopic = new Map<string, AnalyticsFact[]>();
  for (const fact of facts) { if (fact.topicSlug) byTopic.set(fact.topicSlug, [...(byTopic.get(fact.topicSlug) ?? []), fact]); if (fact.subtopicSlug) bySubtopic.set(fact.subtopicSlug, [...(bySubtopic.get(fact.subtopicSlug) ?? []), fact]); }
  const subtopics = topics.flatMap((topic) => topic.subtopics.map((subtopic) => aggregate({ facts: bySubtopic.get(subtopic.slug) ?? [], topicSlug: topic.slug, topicName: topic.name, subtopicSlug: subtopic.slug, subtopicName: subtopic.name, available: counts.get(subtopic.slug) ?? 0 })));
  const topicStats = topics.map((topic) => aggregate({ facts: byTopic.get(topic.slug) ?? [], topicSlug: topic.slug, topicName: topic.name, subtopicSlug: null, subtopicName: null, available: topic.subtopics.reduce((sum, item) => sum + (counts.get(item.slug) ?? 0), 0) }));
  const all = empty(); facts.forEach((fact) => add(all, fact)); const overallMastery = pct(all.earned, all.max); const overallConfidence = confidence(all.answered);
  const eligible = subtopics.filter((item) => item.corpusStatus === 'available');
  const weak = eligible.filter((item) => item.isWeak).sort((a, b) => (a.masteryPercent ?? 100) - (b.masteryPercent ?? 100) || b.answeredCount - a.answeredCount || a.subtopicSlug!.localeCompare(b.subtopicSlug!))[0];
  const starterRank = (slug: string): number => {
    const rank = TIER_A_STARTER_SUBTOPICS.indexOf(slug as never);
    return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
  };
  const assess = eligible.filter((item) => item.confidence !== 'usable').sort((a, b) => starterRank(a.subtopicSlug!) - starterRank(b.subtopicSlug!) || a.subtopicSlug!.localeCompare(b.subtopicSlug!))[0];
  const starter = TIER_A_STARTER_SUBTOPICS.map((slug) => eligible.find((item) => item.subtopicSlug === slug)).find((item): item is LearningAggregateDto => item !== undefined) ?? eligible[0];
  const pick = weak ?? assess ?? starter;
  const nextAction: PracticeRecommendationDto | null = pick === undefined ? null : { topicSlug: pick.topicSlug, subtopicSlug: pick.subtopicSlug!, title: pick.subtopicName!, corpusAvailableQuestionCount: pick.corpusAvailableQuestionCount, kind: weak ? 'needs_practice' : assess ? 'assess' : 'starter', reason: weak ? 'Bạn đã làm đủ câu và kết quả ở phần này cần được củng cố.' : assess ? 'Hãy luyện 5 câu để đánh giá chính xác mức độ thành thạo.' : 'Bắt đầu với một chuyên đề trọng tâm có đủ câu luyện tập.' };
  const recentActivity = [
    ...recentExams.map((item): RecentLearningActivityDto => ({ sourceType: 'exam', id: item.id, title: item.exam.title, completedAt: item.submittedAt.toISOString(), earnedScoreUnits: item.scoreUnits ?? 0, maxScoreUnits: item.maxScoreUnits ?? 0, fullyCorrectCount: item.correctCount, totalQuestions: item.totalQuestions })),
    ...recentPractice.filter((item) => item.submittedAt !== null).map((item): RecentLearningActivityDto => ({ sourceType: 'practice', id: item.id, title: item.subtopic?.name ?? item.topic.name, completedAt: item.submittedAt!.toISOString(), earnedScoreUnits: item.scoreUnits ?? 0, maxScoreUnits: item.maxScoreUnits ?? 0, fullyCorrectCount: item.fullyCorrectCount ?? 0, totalQuestions: item.totalQuestions })),
  ].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 8);
  return { overall: { answeredCount: all.answered, fullyCorrectCount: all.correct, earnedScoreUnits: all.earned, maxScoreUnits: all.max, masteryPercent: overallMastery, confidence: overallConfidence, status: status(all.answered, overallMastery), isWeak: overallConfidence === 'usable' && overallMastery !== null && overallMastery < 60, examQuestionCount: all.exam, practiceQuestionCount: all.practice, lastPracticedAt: all.last?.toISOString() ?? null }, topics: topicStats, subtopics, recentActivity, continueItems: active.map((item) => ({ sourceType: 'practice', sessionId: item.id, title: item.subtopic?.slug ?? item.topic.name, topicSlug: item.topic.slug, subtopicSlug: item.subtopic?.slug ?? null, startedAt: item.startedAt.toISOString() })), nextAction, coverage: { ...coverage, examFactCount: facts.filter((fact) => fact.sourceType === 'exam').length, practiceFactCount: facts.filter((fact) => fact.sourceType === 'practice').length } };
}
