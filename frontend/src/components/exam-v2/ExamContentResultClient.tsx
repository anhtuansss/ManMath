'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../config/api';
import { getAuthToken } from '../../lib/authStorage';
import { readV2ExamResult } from '../../lib/examContentV2Storage';
import { AttemptReviewSection } from './AttemptReviewSection';
import type {
  V2AttemptReviewDto,
  V2AttemptReceiptDto,
  V2ExamResultSession,
  V2PublicQuestionDto,
} from './types';

type ExamContentResultClientProps = { readonly examId: string };
type QuestionType = V2PublicQuestionDto['type'];
type ReviewFilter = 'all' | 'incorrect' | 'unanswered' | 'correct' | 'partial';

type ResultRow = {
  readonly questionId: string;
  readonly type?: QuestionType;
  readonly awardedScoreUnits: number;
  readonly maxScoreUnits: number;
  readonly isFullyCorrect: boolean;
  readonly unanswered: boolean;
};

type ResultSummary = {
  readonly examTitle: string;
  readonly submittedAt: string;
  readonly scoreUnits: number;
  readonly maxScoreUnits: number;
  readonly totalQuestions: number;
  readonly correctCount: number;
  readonly unansweredCount: number;
  readonly durationSeconds: number | null;
  readonly rows: readonly ResultRow[];
};

const sections: ReadonlyArray<{ readonly type: QuestionType; readonly title: string; readonly label: string }> = [
  { type: 'single_choice', title: 'Phần 1', label: 'Trắc nghiệm nhiều lựa chọn' },
  { type: 'true_false_group', title: 'Phần 2', label: 'Trắc nghiệm đúng hoặc sai' },
  { type: 'short_answer', title: 'Phần 3', label: 'Trả lời ngắn' },
];

const formatSubmittedAt = (submittedAt: string): string => new Date(submittedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
const formatDuration = (seconds: number | null): string => seconds === null ? 'Không ghi nhận' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const sectionForType = (type: QuestionType): number => type === 'single_choice' ? 1 : type === 'true_false_group' ? 2 : 3;

function fromReceipt(receipt: V2AttemptReceiptDto, examTitle: string): ResultSummary {
  return { examTitle, submittedAt: receipt.submittedAt, scoreUnits: receipt.scoreUnits, maxScoreUnits: receipt.maxScoreUnits, totalQuestions: receipt.totalQuestions, correctCount: receipt.answers.filter((answer) => answer.isFullyCorrect).length, unansweredCount: receipt.unansweredCount, durationSeconds: receipt.durationSeconds, rows: receipt.answers.map((answer) => ({ questionId: answer.questionExternalId, type: answer.questionType, awardedScoreUnits: answer.awardedScoreUnits, maxScoreUnits: answer.maxScoreUnits, isFullyCorrect: answer.isFullyCorrect, unanswered: answer.response === null })) };
}

function fromSession(session: V2ExamResultSession): ResultSummary {
  return { examTitle: session.examTitle, submittedAt: session.result.submittedAt, scoreUnits: session.result.scoreUnits, maxScoreUnits: session.result.maxScoreUnits, totalQuestions: session.result.totalQuestions, correctCount: session.result.correctCount, unansweredCount: session.result.unansweredCount, durationSeconds: session.result.durationSeconds, rows: session.result.results.map((result) => ({ questionId: result.questionId, awardedScoreUnits: result.awardedScore, maxScoreUnits: 0, isFullyCorrect: result.isCorrect, unanswered: result.response === undefined })) };
}

const isPartial = (row: ResultRow): boolean => !row.unanswered && !row.isFullyCorrect && row.maxScoreUnits > 0 && row.awardedScoreUnits > 0;
const getRowState = (row: ResultRow): 'correct' | 'incorrect' | 'unanswered' | 'partial' => row.unanswered ? 'unanswered' : row.isFullyCorrect ? 'correct' : isPartial(row) ? 'partial' : 'incorrect';
const rowStateLabel = (row: ResultRow): string => ({ correct: 'Đúng', incorrect: 'Sai', unanswered: 'Chưa làm', partial: 'Đúng một phần' })[getRowState(row)];
const rowStateClass = (row: ResultRow): string => ({ correct: 'border-success-border bg-success-light text-success', incorrect: 'border-error-border bg-error-light text-error', unanswered: 'border-warning-border bg-warning-light text-warning', partial: 'border-primary-light bg-primary-light/40 text-primary' })[getRowState(row)];

export function ExamContentResultClient({ examId }: ExamContentResultClientProps) {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [session, setSession] = useState<V2ExamResultSession | null>(null);
  const [receipt, setReceipt] = useState<V2AttemptReceiptDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [review, setReview] = useState<V2AttemptReviewDto | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const stored = readV2ExamResult(sessionStorage, examId);
      if (active) setSession(stored);
      const token = getAuthToken();
      const anonymousReceiptToken = stored?.wasAuthenticated ? undefined : stored?.result.anonymousReceiptToken;
      if (!attemptId || (!token && !anonymousReceiptToken)) { if (active) setLoading(false); return; }
      try {
        const response = token ? await fetch(`${API_BASE_URL}/api/v2/attempts/${encodeURIComponent(attemptId)}`, { headers: { Authorization: `Bearer ${token}` } }) : await fetch(`${API_BASE_URL}/api/v2/attempts/${encodeURIComponent(attemptId)}/anonymous-receipt`, { headers: { 'X-Attempt-Receipt-Token': anonymousReceiptToken! } });
        if (!response.ok) throw new Error('Không thể tải lại biên nhận bài làm.');
        const data = await response.json() as V2AttemptReceiptDto;
        if (data.examId !== examId) throw new Error('Biên nhận không thuộc đề thi này.');
        if (active) setReceipt(data);
      } catch (error) {
        if (!active) return;
        if (stored?.wasAuthenticated) { setSession(null); setReadError(error instanceof Error ? error.message : 'Không thể tải lại kết quả.'); return; }
        if (!stored) setReadError(error instanceof Error ? error.message : 'Không thể tải lại kết quả.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [attemptId, examId]);

  const summary = useMemo(() => receipt ? fromReceipt(receipt, session?.examTitle ?? 'Kết quả đề V2') : session ? fromSession(session) : null, [receipt, session]);
  const canLoadReview = attemptId !== null && receipt !== null && getAuthToken() !== null;

  const loadReview = async (): Promise<void> => {
    const token = getAuthToken();
    if (!attemptId || !token) return;
    setIsReviewLoading(true); setReviewError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/attempts/${encodeURIComponent(attemptId)}/review`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Không thể tải review đáp án.');
      const data = await response.json() as V2AttemptReviewDto;
      if (data.examId !== examId) throw new Error('Review không thuộc đề thi này.');
      setReview(data);
    } catch (error) { setReviewError(error instanceof Error ? error.message : 'Không thể tải review đáp án.');
    } finally { setIsReviewLoading(false); }
  };

  if (loading) return <main className="min-h-[100dvh] bg-background px-4 py-8"><div className="mx-auto h-64 max-w-5xl animate-pulse rounded-xl border border-border bg-surface" /></main>;
  if (!summary) return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><section className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h1 className="text-xl font-bold text-text-primary">Không có kết quả để hiển thị</h1><p className="mt-3 text-sm leading-6 text-text-secondary">{readError ?? 'Kết quả anonymous chỉ có ngay sau khi nộp bài và không thể tải lại từ máy chủ.'}</p><Link href={`/exam-v2/${examId}`} className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white">Làm đề</Link></section></main>;

  const score = summary.scoreUnits / 100;
  const incorrectCount = Math.max(summary.totalQuestions - summary.correctCount - summary.unansweredCount, 0);
  const filteredRows = summary.rows.filter((row) => filter === 'all' || getRowState(row) === filter);
  const selectedQuestion = review?.questions.find((question) => question.id === selectedQuestionId) ?? null;
  const filterOptions: ReadonlyArray<{ readonly id: ReviewFilter; readonly label: string }> = [{ id: 'all', label: 'Tất cả' }, { id: 'incorrect', label: 'Sai' }, { id: 'unanswered', label: 'Chưa làm' }, { id: 'correct', label: 'Đúng' }, ...(summary.rows.some(isPartial) ? [{ id: 'partial' as const, label: 'Đúng một phần' }] : [])];

  return <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-6"><header className="border-b border-border pb-5"><p className="text-sm font-medium text-text-secondary">Kết quả bài làm</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{summary.examTitle}</h1><p className="mt-2 text-sm text-text-secondary">Nộp lúc {formatSubmittedAt(summary.submittedAt)} · Thời gian {formatDuration(summary.durationSeconds)}</p></header>
    <section className="grid overflow-hidden rounded-xl border border-border bg-surface shadow-card lg:grid-cols-[260px_1fr]"><div className="flex items-center justify-center border-b border-border p-6 lg:border-b-0 lg:border-r"><div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[8px] border-primary-light text-center"><p className="text-4xl font-bold tabular-nums text-primary">{score.toFixed(2)}</p><p className="mt-1 text-xs text-text-secondary">/ {(summary.maxScoreUnits / 100).toFixed(2)} điểm</p></div></div><div className="grid grid-cols-2 gap-x-5 gap-y-6 p-6 sm:grid-cols-4"><div><p className="text-xs text-text-secondary">Đúng</p><p className="mt-1 text-2xl font-bold tabular-nums text-success">{summary.correctCount}</p></div><div><p className="text-xs text-text-secondary">Sai</p><p className="mt-1 text-2xl font-bold tabular-nums text-error">{incorrectCount}</p></div><div><p className="text-xs text-text-secondary">Chưa làm</p><p className="mt-1 text-2xl font-bold tabular-nums text-warning">{summary.unansweredCount}</p></div><div><p className="text-xs text-text-secondary">Tổng câu</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{summary.totalQuestions}</p></div></div></section>
    {summary.rows.every((row) => row.type !== undefined) ? <section className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6"><div><p className="text-sm font-medium text-text-secondary">Tổng quan</p><h2 className="mt-1 text-xl font-bold text-text-primary">Kết quả theo từng phần</h2></div><div className="mt-5 grid gap-4 lg:grid-cols-3">{sections.map((section) => { const rows = summary.rows.filter((row) => row.type === section.type); const awarded = rows.reduce((total, row) => total + row.awardedScoreUnits, 0); const maximum = rows.reduce((total, row) => total + row.maxScoreUnits, 0); const correct = rows.filter((row) => row.isFullyCorrect).length; const percentage = maximum === 0 ? 0 : Math.round((awarded / maximum) * 100); return <div key={section.type} className="border-l-2 border-primary-light pl-4"><p className="text-sm font-semibold text-text-primary">{section.title}</p><p className="mt-1 text-xs text-text-secondary">{section.label}</p><div className="mt-4 flex items-end justify-between gap-3"><p className="text-sm text-text-secondary"><span className="font-semibold text-text-primary">{correct}/{rows.length}</span> câu đúng</p><p className="text-sm font-bold tabular-nums text-primary">{awarded}/{maximum}</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background-alt"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-xs text-text-secondary">{percentage}% điểm phần</p></div>; })}</div></section> : null}
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-text-secondary">Biên nhận chấm điểm</p><h2 className="mt-1 text-xl font-bold text-text-primary">Danh sách câu</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Chọn một câu để xem chi tiết. Đáp án đúng chỉ hiển thị trong review của bài đã nộp khi đăng nhập.</p></div>{canLoadReview ? <button type="button" onClick={() => void loadReview()} disabled={isReviewLoading || review !== null} className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-background-alt disabled:cursor-not-allowed disabled:opacity-60">{review ? 'Review đã tải' : isReviewLoading ? 'Đang tải review...' : 'Xem đáp án đúng'}</button> : null}</div><div className="mt-5 flex flex-wrap gap-2">{filterOptions.map((option) => <button key={option.id} type="button" onClick={() => setFilter(option.id)} aria-pressed={filter === option.id} className={`h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${filter === option.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-secondary hover:bg-background-alt'}`}>{option.label}</button>)}</div><div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-11">{filteredRows.map((row, index) => { const originalIndex = summary.rows.findIndex((candidate) => candidate.questionId === row.questionId); const selected = row.questionId === selectedQuestionId; return <button key={row.questionId} type="button" onClick={() => setSelectedQuestionId(row.questionId)} aria-pressed={selected} aria-label={`Câu ${originalIndex + 1}: ${rowStateLabel(row)}`} className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold transition-transform active:scale-[0.98] ${selected ? 'ring-2 ring-primary ring-offset-2' : ''} ${rowStateClass(row)}`}>{originalIndex + 1}</button>; })}</div>{filteredRows.length === 0 ? <p className="mt-5 text-sm text-text-secondary">Không có câu phù hợp với bộ lọc này.</p> : null}{reviewError ? <p className="mt-5 rounded-lg border border-error-border bg-error-light px-3 py-2 text-sm text-error">{reviewError}</p> : null}</section>
    {selectedQuestionId !== null && review === null ? <section className="rounded-xl border border-border bg-surface p-5 text-sm leading-6 text-text-secondary shadow-card"><p className="font-semibold text-text-primary">Câu đã chọn</p><p className="mt-1">Tải review đáp án để xem nội dung câu hỏi, câu trả lời của bạn và đáp án đúng.</p></section> : null}
    {selectedQuestion ? <AttemptReviewSection question={selectedQuestion} questionNumber={(review?.questions.findIndex((question) => question.id === selectedQuestion.id) ?? 0) + 1} /> : null}
    <div className="flex flex-wrap gap-3"><Link href={`/exam-v2/${examId}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white">Làm lại đề</Link><Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary">Về kho đề</Link></div>
  </div></main>;
}
