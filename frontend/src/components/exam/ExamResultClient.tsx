'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';
import { ResultQuestionNavigator } from './ResultQuestionNavigator';
import { getReviewStatus, ReviewQuestionCard, type ReviewStatus } from './ReviewQuestionCard';
import type { ExamDetailDto, ExamResultSession, TopicStatDto } from './types';
import { API_BASE_URL } from '../../config/api';
import { getExamAnswersKey, getExamResultKey, readResultStorage, removeStorageItem } from '../../lib/storage';

type ExamResultClientProps = { examId: string };
type ReviewFilter = 'all' | ReviewStatus;

const formatSubmittedAt = (submittedAt: string): string => new Date(submittedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
const clampAccuracy = (accuracy: number): number => Math.min(Math.max(accuracy, 0), 100);
const getScoreState = (score: number): string => score >= 8 ? 'Làm tốt' : score >= 5 ? 'Đạt mục tiêu' : 'Cần cải thiện';
const getTopicState = (topic: TopicStatDto): string => topic.total < 3 ? 'Chưa đủ dữ liệu' : topic.accuracy < 60 ? 'Cần ôn' : topic.accuracy >= 80 ? 'Ổn định' : 'Đang củng cố';

function ResultEmptyState({ examId }: ExamResultClientProps) {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-text-primary"><section className="w-full max-w-xl rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h1 className="text-2xl font-bold text-text-primary">Chưa có kết quả bài làm</h1><p className="mt-3 text-sm leading-6 text-text-secondary">Trang này chỉ hiển thị sau khi bạn nộp bài.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover">Về kho đề</Link><Link href={`/exam/${examId}`} className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors hover:bg-background-alt">Làm đề này</Link></div></section></main>;
}

export function ExamResultClient({ examId }: ExamResultClientProps) {
  const router = useRouter();
  const [resultSession, setResultSession] = useState<ExamResultSession | null>(null);
  const [exam, setExam] = useState<ExamDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  useEffect(() => {
    let isActive = true;
    const loadResult = async () => {
      setLoading(true);
      setReviewError(null);
      const storedResult = readResultStorage(sessionStorage, examId);
      if (!storedResult) {
        if (isActive) { setResultSession(null); setExam(null); setLoading(false); }
        return;
      }
      if (!isActive) return;
      setResultSession(storedResult);
      if (storedResult.exam) { setExam(storedResult.exam); setLoading(false); return; }
      try {
        const response = await fetch(`${API_BASE_URL}/api/exams/${examId}`);
        if (!response.ok) throw new Error('Không tải được chi tiết đề để review đáp án');
        const examData: ExamDetailDto = await response.json();
        if (isActive) setExam(examData);
      } catch (error) {
        if (isActive) setReviewError(error instanceof Error ? error.message : 'Không tải được chi tiết đề để review đáp án');
      } finally { if (isActive) setLoading(false); }
    };
    void loadResult();
    return () => { isActive = false; };
  }, [examId]);

  const handleRetakeExam = () => { removeStorageItem(sessionStorage, getExamResultKey(examId)); removeStorageItem(localStorage, getExamAnswersKey(examId)); router.push(`/exam/${examId}`); };
  const scrollToReview = () => document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const questionStatuses = useMemo(() => exam?.questions.map((question) => getReviewStatus(question, resultSession?.answers[question.id])) ?? [], [exam, resultSession]);
  if (loading) return <main className="min-h-[100dvh] bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8"><div className="mx-auto w-full max-w-6xl animate-pulse space-y-6"><div className="h-28 border-b border-border bg-background-alt" /><div className="h-52 rounded-xl border border-border bg-surface" /><div className="h-64 rounded-xl border border-border bg-surface" /></div></main>;
  if (!resultSession) return <ResultEmptyState examId={examId} />;

  const { submitResult } = resultSession;
  const answeredCount = exam?.questions.filter((question) => resultSession.answers[question.id] !== undefined).length ?? Object.keys(resultSession.answers).length;
  const unansweredCount = Math.max(submitResult.totalQuestions - answeredCount, 0);
  const incorrectCount = Math.max(submitResult.totalQuestions - submitResult.correctCount - unansweredCount, 0);
  const accuracy = submitResult.totalQuestions > 0 ? Math.round((submitResult.correctCount / submitResult.totalQuestions) * 100) : 0;
  const reviewCounts: Record<ReviewFilter, number> = { all: exam?.questions.length ?? submitResult.totalQuestions, correct: questionStatuses.filter((status) => status === 'correct').length, incorrect: questionStatuses.filter((status) => status === 'incorrect').length, unanswered: questionStatuses.filter((status) => status === 'unanswered').length };
  const visibleQuestions = exam?.questions.filter((question) => reviewFilter === 'all' || getReviewStatus(question, resultSession.answers[question.id]) === reviewFilter) ?? [];
  const visibleTopics = (submitResult.topicStats ?? []).filter((topic) => topic.total > 0).slice(0, 6);
  const shouldShowTopicEmpty = answeredCount === 0 || visibleTopics.length === 0;
  const nextActionText = incorrectCount + unansweredCount > 0 ? 'Ôn lại các câu sai và chưa làm' : 'Xem lại đáp án để củng cố cách giải';

  return <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <header className="border-b border-border pb-5"><div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-6"><div className="min-w-0 lg:col-span-7"><Link href="/dashboard" aria-label="Về kho đề" className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><Logo className="h-8 w-8" /><span className="text-sm font-semibold text-text-primary">ManMath</span></Link><p className="mt-4 text-sm font-medium text-text-secondary">Kết quả bài làm</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{resultSession.examTitle}</h1><p className="mt-2 text-sm text-text-secondary">Nộp lúc {formatSubmittedAt(resultSession.submittedAt)}</p></div><div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end"><button type="button" onClick={scrollToReview} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem lại đáp án</button><button type="button" onClick={handleRetakeExam} className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Làm lại đề</button><Link href="/dashboard" className="inline-flex h-10 items-center justify-center text-sm font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Về kho đề</Link></div></div></header>

    <section className="grid overflow-hidden rounded-xl border border-border bg-surface shadow-card lg:grid-cols-12 lg:items-stretch"><div className="flex items-center gap-5 p-5 lg:col-span-3 lg:justify-center lg:border-r lg:border-border"><div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[7px] border-primary-light text-center"><div><p className="text-4xl font-bold tabular-nums text-primary">{submitResult.score.toFixed(1)}</p><p className="mt-1 text-xs font-medium text-text-secondary">/10 điểm</p></div></div><div className="lg:hidden"><p className="text-sm font-semibold text-text-primary">{getScoreState(submitResult.score)}</p><p className="mt-1 text-sm text-text-secondary">{submitResult.correctCount}/{submitResult.totalQuestions} câu đúng</p></div></div><div className="grid grid-cols-2 content-center gap-x-5 gap-y-4 border-t border-border p-5 sm:grid-cols-4 lg:col-span-5 lg:border-t-0 lg:border-r lg:border-border"><div><p className="text-xs text-text-secondary">Đúng</p><p className="mt-1 text-2xl font-bold tabular-nums text-success">{submitResult.correctCount}</p></div><div><p className="text-xs text-text-secondary">Sai</p><p className="mt-1 text-2xl font-bold tabular-nums text-error">{incorrectCount}</p></div><div><p className="text-xs text-text-secondary">Chưa làm</p><p className="mt-1 text-2xl font-bold tabular-nums text-warning">{unansweredCount}</p></div><div><p className="text-xs text-text-secondary">Tỷ lệ đúng</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{accuracy}%</p></div></div><div className="flex flex-col justify-center border-t border-border p-5 lg:col-span-4 lg:border-t-0"><p className="text-sm font-medium text-text-secondary">Bước tiếp theo</p><h2 className="mt-1 text-lg font-bold text-text-primary">{getScoreState(submitResult.score)}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{nextActionText} trước khi bắt đầu một lượt mới.</p><button type="button" onClick={scrollToReview} className="mt-4 inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{nextActionText}</button></div></section>

    <section className="border-t border-border pt-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-text-secondary">Phân tích theo chuyên đề</p><h2 className="mt-1 text-xl font-bold text-text-primary">Năng lực theo chuyên đề</h2></div><Link href="/analytics" className="inline-flex text-sm font-semibold text-primary hover:text-primary-hover">Xem phân tích đầy đủ</Link></div>{shouldShowTopicEmpty ? <p className="mt-4 border-y border-border py-3 text-sm leading-6 text-text-secondary">Chưa có đủ câu trả lời để đánh giá chính xác năng lực theo chuyên đề.</p> : <div className="mt-4 divide-y divide-border border-y border-border">{visibleTopics.map((topic) => { const topicAccuracy = clampAccuracy(topic.accuracy); return <div key={topic.topicId ?? topic.topicName} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_100px_124px] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold text-text-primary">{topic.topicName}</p><p className="mt-1 text-xs text-text-secondary">{topic.correct}/{topic.total} câu đúng</p></div><div className="h-1.5 overflow-hidden rounded-full bg-background-alt"><div className="h-full rounded-full bg-primary" style={{ width: `${topicAccuracy}%` }} /></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-xs font-semibold tabular-nums text-text-secondary">{topicAccuracy}%</span><span className="text-xs font-medium text-text-secondary">{getTopicState(topic)}</span></div></div>; })}</div>}</section>

    <section id="review-section" className="scroll-mt-24 border-t border-border pt-6"><div><p className="text-sm font-medium text-text-secondary">Review đáp án</p><h2 className="mt-1 text-xl font-bold text-text-primary">Xem lại theo từng câu</h2></div>{reviewError ? <p className="mt-4 border-l-2 border-warning bg-warning-light px-4 py-3 text-sm leading-6 text-text-secondary">{reviewError}</p> : null}{exam ? <><div className="sticky top-0 z-20 mt-4 border-y border-border bg-background py-3"><div className="flex gap-2 overflow-x-auto"><span className="sr-only">Lọc câu hỏi review</span>{([['all', 'Tất cả'], ['incorrect', 'Sai'], ['unanswered', 'Chưa làm'], ['correct', 'Đúng']] as const).map(([filter, label]) => <button key={filter} type="button" onClick={() => setReviewFilter(filter)} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${reviewFilter === filter ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-secondary hover:bg-background-alt'}`}>{label}<span className="tabular-nums">{reviewCounts[filter]}</span></button>)}</div></div><div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start"><div className="min-w-0 space-y-3">{visibleQuestions.length > 0 ? visibleQuestions.map((question) => { const index = exam.questions.findIndex((item) => item.id === question.id); return <ReviewQuestionCard key={question.id} question={question} index={index} selectedOptionIndex={resultSession.answers[question.id]} />; }) : <p className="border-y border-border py-5 text-sm text-text-secondary">Không có câu phù hợp với bộ lọc này.</p>}<div className="pt-2"><Link href={`/exam/${examId}/attempts`} className="inline-flex text-sm font-semibold text-primary hover:text-primary-hover">Xem lịch sử các lần làm đề này</Link></div></div><aside className="lg:sticky lg:top-6"><ResultQuestionNavigator questions={exam.questions} answers={resultSession.answers} /></aside></div></> : <p className="mt-4 border-y border-border py-4 text-sm text-text-secondary">Chưa có dữ liệu chi tiết để hiển thị review từng câu.</p>}</section>
  </div></main>;
}
