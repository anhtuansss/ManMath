'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../config/api';
import { getAuthToken } from '../../lib/authStorage';
import { readV2ExamResult } from '../../lib/examContentV2Storage';
import { AttemptReviewSection } from './AttemptReviewSection';
import type {
  V2AttemptReviewDto,
  V2AttemptReceiptDto,
  V2ExamResultSession,
} from './types';

type ExamContentResultClientProps = {
  examId: string;
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
  readonly rows: readonly {
    readonly questionId: string;
    readonly awardedScoreUnits: number;
    readonly maxScoreUnits: number;
    readonly isFullyCorrect: boolean;
    readonly unanswered: boolean;
  }[];
};

const formatSubmittedAt = (submittedAt: string): string => new Date(submittedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
const formatDuration = (seconds: number | null): string => {
  if (seconds === null) return 'Không ghi nhận';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

function fromReceipt(receipt: V2AttemptReceiptDto, examTitle: string): ResultSummary {
  return {
    examTitle,
    submittedAt: receipt.submittedAt,
    scoreUnits: receipt.scoreUnits,
    maxScoreUnits: receipt.maxScoreUnits,
    totalQuestions: receipt.totalQuestions,
    correctCount: receipt.answers.filter((answer) => answer.isFullyCorrect).length,
    unansweredCount: receipt.unansweredCount,
    durationSeconds: receipt.durationSeconds,
    rows: receipt.answers.map((answer) => ({
      questionId: answer.questionExternalId,
      awardedScoreUnits: answer.awardedScoreUnits,
      maxScoreUnits: answer.maxScoreUnits,
      isFullyCorrect: answer.isFullyCorrect,
      unanswered: answer.response === null,
    })),
  };
}

function fromSession(session: V2ExamResultSession): ResultSummary {
  return {
    examTitle: session.examTitle,
    submittedAt: session.result.submittedAt,
    scoreUnits: session.result.scoreUnits,
    maxScoreUnits: session.result.maxScoreUnits,
    totalQuestions: session.result.totalQuestions,
    correctCount: session.result.correctCount,
    unansweredCount: session.result.unansweredCount,
    durationSeconds: session.result.durationSeconds,
    rows: session.result.results.map((result) => ({
      questionId: result.questionId,
      awardedScoreUnits: result.awardedScore,
      maxScoreUnits: 0,
      isFullyCorrect: result.isCorrect,
      unanswered: result.response === undefined,
    })),
  };
}

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

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const stored = readV2ExamResult(sessionStorage, examId);
      if (active) setSession(stored);

      const token = getAuthToken();
      if (!attemptId || !token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v2/attempts/${encodeURIComponent(attemptId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Không thể tải lại biên nhận bài làm.');
        const data = await response.json() as V2AttemptReceiptDto;
        if (data.examId !== examId) throw new Error('Biên nhận không thuộc đề thi này.');
        if (active) setReceipt(data);
      } catch (error) {
        if (!active) return;

        // A server-owned receipt is authoritative for authenticated attempts.
        // Do not keep showing an old browser session after ownership is denied.
        if (stored?.wasAuthenticated) {
          setSession(null);
          setReadError(error instanceof Error ? error.message : 'Không thể tải lại kết quả.');
          return;
        }

        if (!stored) setReadError(error instanceof Error ? error.message : 'Không thể tải lại kết quả.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [attemptId, examId]);

  const summary = useMemo(() => {
    if (receipt) return fromReceipt(receipt, session?.examTitle ?? 'Kết quả đề V2');
    return session ? fromSession(session) : null;
  }, [receipt, session]);

  const canLoadReview = attemptId !== null && receipt !== null && getAuthToken() !== null;

  const loadReview = async (): Promise<void> => {
    const token = getAuthToken();
    if (!attemptId || !token) return;

    setIsReviewLoading(true);
    setReviewError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/attempts/${encodeURIComponent(attemptId)}/review`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Không thể tải review đáp án.');
      const data = await response.json() as V2AttemptReviewDto;
      if (data.examId !== examId) throw new Error('Review không thuộc đề thi này.');
      setReview(data);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Không thể tải review đáp án.');
    } finally {
      setIsReviewLoading(false);
    }
  };

  if (loading) return <main className="min-h-[100dvh] bg-background px-4 py-8"><div className="mx-auto h-64 max-w-4xl animate-pulse rounded-xl border border-border bg-surface" /></main>;
  if (!summary) return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><section className="w-full max-w-lg rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h1 className="text-xl font-bold text-text-primary">Không có kết quả để hiển thị</h1><p className="mt-3 text-sm leading-6 text-text-secondary">{readError ?? 'Kết quả anonymous chỉ có ngay sau khi nộp bài và không thể tải lại từ máy chủ.'}</p><Link href={`/exam-v2/${examId}`} className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white">Làm đề</Link></section></main>;

  const score = summary.scoreUnits / 100;
  const incorrectCount = Math.max(summary.totalQuestions - summary.correctCount - summary.unansweredCount, 0);
  return <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8"><div className="mx-auto flex max-w-5xl flex-col gap-6"><header className="border-b border-border pb-5"><p className="text-sm font-medium text-text-secondary">Kết quả bài làm V2</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{summary.examTitle}</h1><p className="mt-2 text-sm text-text-secondary">Nộp lúc {formatSubmittedAt(summary.submittedAt)} · Thời gian {formatDuration(summary.durationSeconds)}</p></header>
    <section className="grid overflow-hidden rounded-xl border border-border bg-surface shadow-card md:grid-cols-[220px_1fr]"><div className="flex items-center justify-center border-b border-border p-6 md:border-b-0 md:border-r"><div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-[7px] border-primary-light"><p className="text-4xl font-bold tabular-nums text-primary">{score.toFixed(2)}</p><p className="mt-1 text-xs text-text-secondary">/ { (summary.maxScoreUnits / 100).toFixed(2) } điểm</p></div></div><div className="grid grid-cols-2 gap-5 p-6 sm:grid-cols-4"><div><p className="text-xs text-text-secondary">Đúng</p><p className="mt-1 text-2xl font-bold text-success">{summary.correctCount}</p></div><div><p className="text-xs text-text-secondary">Sai</p><p className="mt-1 text-2xl font-bold text-error">{incorrectCount}</p></div><div><p className="text-xs text-text-secondary">Chưa làm</p><p className="mt-1 text-2xl font-bold text-warning">{summary.unansweredCount}</p></div><div><p className="text-xs text-text-secondary">Tổng câu</p><p className="mt-1 text-2xl font-bold text-text-primary">{summary.totalQuestions}</p></div></div></section>
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-text-secondary">Biên nhận chấm điểm</p><h2 className="mt-1 text-xl font-bold text-text-primary">Kết quả theo từng câu</h2></div>{canLoadReview ? <button type="button" onClick={() => void loadReview()} disabled={isReviewLoading || review !== null} className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text-primary hover:bg-background-alt disabled:cursor-not-allowed disabled:opacity-60">{review ? 'Đã tải review' : isReviewLoading ? 'Đang tải...' : 'Xem đáp án đúng'}</button> : <span className="text-xs text-text-secondary">Review đáp án chỉ khả dụng với bài đã nộp khi đăng nhập.</span>}</div><div className="mt-5 divide-y divide-border border-y border-border">{summary.rows.map((row, index) => <div key={row.questionId} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-semibold text-text-primary">Câu {index + 1}</p><p className={`mt-1 text-xs font-medium ${row.unanswered ? 'text-warning' : row.isFullyCorrect ? 'text-success' : 'text-error'}`}>{row.unanswered ? 'Chưa làm' : row.isFullyCorrect ? 'Đúng' : 'Chưa đúng'}</p></div><p className="text-sm font-semibold tabular-nums text-text-primary">{row.awardedScoreUnits}{row.maxScoreUnits > 0 ? ` / ${row.maxScoreUnits}` : ''} units</p></div>)}</div>{reviewError ? <p className="mt-4 rounded-lg border border-error-border bg-error-light px-3 py-2 text-sm text-error">{reviewError}</p> : null}</section>
    {review ? <AttemptReviewSection questions={review.questions} /> : null}
    <div className="flex flex-wrap gap-3"><Link href={`/exam-v2/${examId}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white">Làm lại đề</Link><Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary">Về kho đề</Link></div>
  </div></main>;
}
