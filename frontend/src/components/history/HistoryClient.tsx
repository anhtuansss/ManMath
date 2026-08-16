'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fetchProtectedJson, getCurrentUser, isUnauthorizedError } from '../../lib/authApi';
import { subscribeAuthTokenChange } from '../../lib/authStorage';
import { getAttemptDetailHref, getRetakeExamHref } from '../../lib/attemptLinks';
import type { HistoryAttempt, HistorySummary, UserAttemptsResponse } from '../../lib/apiTypes';

type HistoryStatus = 'loading' | 'unauthorized' | 'ready' | 'error';

const PAGE_LIMIT = 5;
const EMPTY_SUMMARY: HistorySummary = { totalAttempts: 0, averageScore: 0, bestScore: 0 };

const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const formatSubmittedAt = (submittedAt: string): string => new Date(submittedAt).toLocaleString('vi-VN', {
  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
});

const formatDuration = (durationSeconds: number | null): string => {
  if (durationSeconds === null) return 'Không lưu thời gian';
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}p ${seconds.toString().padStart(2, '0')}s`;
};

export function HistoryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedPage = parsePage(searchParams.get('page'));
  const listRef = useRef<HTMLElement>(null);
  const hasLoadedPage = useRef(false);
  const [status, setStatus] = useState<HistoryStatus>('loading');
  const [summary, setSummary] = useState<HistorySummary>(EMPTY_SUMMARY);
  const [attempts, setAttempts] = useState<HistoryAttempt[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isListLoading, setIsListLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const resetHistory = () => {
      setSummary(EMPTY_SUMMARY);
      setAttempts([]);
      setPage(1);
      setTotalItems(0);
      setTotalPages(1);
    };

    const loadHistory = async () => {
      const isPageChange = hasLoadedPage.current;
      if (isPageChange) setIsListLoading(true);
      else setStatus('loading');
      setErrorMessage(null);

      try {
        const currentUser = await getCurrentUser();
        if (!isMounted) return;
        if (!currentUser) {
          resetHistory();
          setStatus('unauthorized');
          return;
        }

        const response = await fetchProtectedJson<UserAttemptsResponse>(`/api/me/attempts?page=${requestedPage}&limit=${PAGE_LIMIT}&sort=latest`);
        if (!isMounted) return;

        setSummary(response.summary ?? EMPTY_SUMMARY);
        setAttempts(Array.isArray(response.items) ? response.items : []);
        setPage(response.page);
        setTotalItems(response.totalItems);
        setTotalPages(response.totalPages);
        setStatus('ready');
        hasLoadedPage.current = true;

        if (response.page !== requestedPage) {
          router.replace(`${pathname}?page=${response.page}`, { scroll: false });
        } else if (isPageChange) {
          listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        if (isUnauthorizedError(error)) {
          resetHistory();
          setStatus('unauthorized');
          setErrorMessage(null);
          return;
        }
        setErrorMessage('Không tải được lịch sử làm bài. Hãy thử lại sau.');
        setStatus('error');
      } finally {
        if (isMounted) setIsListLoading(false);
      }
    };

    void loadHistory();
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => {
      hasLoadedPage.current = false;
      void loadHistory();
    });
    return () => {
      isMounted = false;
      unsubscribeAuthTokenChange();
    };
  }, [pathname, requestedPage, router]);

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    router.push(`${pathname}?page=${nextPage}`, { scroll: false });
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl animate-fade-in flex-col gap-6">
        <header className="border-b border-border pb-5">
          <p className="workspace-eyebrow">Lịch sử học tập</p>
          <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="workspace-page-title text-text-primary">Các lần làm bài của bạn</h1>
              <p className="workspace-page-description mt-2">Xem lại kết quả, thời gian làm và tiếp tục luyện đề từ lượt trước.</p>
            </div>
            <Link href="/dashboard" className="workspace-button-text inline-flex h-10 items-center justify-center text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Về trang luyện đề</Link>
          </div>
        </header>

        {status === 'loading' && <><section className="rounded-xl border border-border bg-surface p-5 shadow-card"><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="border-b border-border pb-4 last:border-b-0 sm:border-b-0 sm:border-r sm:pr-4 sm:last:border-r-0"><div className="h-4 w-24 animate-pulse rounded bg-background-alt" /><div className="mt-3 h-8 w-20 animate-pulse rounded bg-background-alt" /></div>)}</div></section><section className="rounded-xl border border-border bg-surface p-5 shadow-card"><div className="h-5 w-44 animate-pulse rounded bg-background-alt" /><div className="mt-4 divide-y divide-border">{[0, 1, 2].map((item) => <div key={item} className="py-4"><div className="h-4 w-48 animate-pulse rounded bg-background-alt" /><div className="mt-3 h-3 w-56 animate-pulse rounded bg-background-alt" /></div>)}</div></section></>}

        {status === 'unauthorized' && <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h2 className="workspace-section-title text-text-primary">Bạn cần đăng nhập để xem lịch sử làm bài.</h2><p className="workspace-page-description mx-auto mt-2 max-w-md">Đăng nhập ở trang luyện đề để xem các lần làm đã lưu và mở lại chi tiết từng bài.</p><Link href="/dashboard" className="workspace-button-text mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Về trang luyện đề</Link></section>}

        {status === 'error' && <section className="rounded-xl border border-error-border bg-surface p-6 shadow-card"><h2 className="workspace-section-title text-error">Không tải được lịch sử</h2><p className="workspace-page-description mt-2">{errorMessage}</p></section>}

        {status === 'ready' && <>
          <section className="rounded-xl border border-border bg-surface p-5 shadow-card"><div className="grid gap-4 sm:grid-cols-3"><div className="border-b border-border pb-4 sm:border-b-0 sm:border-r sm:pr-4"><p className="workspace-metadata">Tổng số lần làm</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{summary.totalAttempts}</p></div><div className="border-b border-border pb-4 sm:border-b-0 sm:border-r sm:pr-4"><p className="workspace-metadata">Điểm trung bình</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{summary.averageScore.toFixed(1)}</p></div><div><p className="workspace-metadata">Điểm tốt nhất</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{summary.bestScore.toFixed(1)}</p></div></div></section>

          {totalItems === 0 ? <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h2 className="workspace-section-title text-text-primary">Bạn chưa có lịch sử luyện đề.</h2><p className="workspace-page-description mx-auto mt-2 max-w-xl">Làm một đề để bắt đầu lưu lịch sử, xem lại chi tiết và theo dõi kết quả theo thời gian.</p><Link href="/dashboard" className="workspace-button-text mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Làm một đề ngay</Link></section> : <section ref={listRef} id="history-list" className="scroll-mt-24 rounded-xl border border-border bg-surface shadow-card">
            <div className="flex flex-col gap-2 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="workspace-section-title text-text-primary">Lần làm gần đây</h2><p className="workspace-page-description mt-1">{totalItems} lượt làm, hiển thị {attempts.length} lượt trên trang này.</p></div><span className="workspace-badge-text text-text-secondary">Trang {page}/{totalPages}</span></div>
            <div className="relative divide-y divide-border">{isListLoading ? <div className="absolute inset-0 z-10 bg-surface/70" aria-live="polite" aria-label="Đang tải trang lịch sử" /> : null}{attempts.map((attempt) => { const accuracy = attempt.totalQuestions > 0 ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100) : 0; return <article key={attempt.attemptId} className="px-5 py-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="workspace-item-title truncate text-text-primary">{attempt.examTitle}</p><div className="workspace-metadata mt-1 flex flex-wrap gap-x-4 gap-y-1"><span>{formatSubmittedAt(attempt.submittedAt)}</span><span>{formatDuration(attempt.durationSeconds)}</span><span>{attempt.correctCount}/{attempt.totalQuestions} câu đúng</span></div></div><div className="flex flex-wrap items-center gap-3 lg:justify-end"><div className="text-left lg:text-right"><p className="workspace-item-title tabular-nums text-text-primary">{attempt.score.toFixed(1)} điểm</p><p className="workspace-metadata mt-1">{accuracy}% đúng</p></div><Link href={getAttemptDetailHref(attempt)} className="workspace-button-text inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem chi tiết</Link><Link href={getRetakeExamHref(attempt.examId)} className="workspace-button-text inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Làm lại</Link></div></div></article>; })}</div>
            <nav className="flex items-center justify-between gap-3 border-t border-border px-5 py-4" aria-label="Phân trang lịch sử làm bài"><button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1 || isListLoading} className="workspace-button-text inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-text-primary transition-colors hover:bg-background-alt disabled:cursor-not-allowed disabled:opacity-50">Trang trước</button><p className="workspace-metadata text-center">Trang {page} trên {totalPages}</p><button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages || isListLoading} className="workspace-button-text inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-text-primary transition-colors hover:bg-background-alt disabled:cursor-not-allowed disabled:opacity-50">Trang sau</button></nav>
          </section>}
        </>}
      </div>
    </main>
  );
}
