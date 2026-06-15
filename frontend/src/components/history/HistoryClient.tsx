'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '../exam/Logo';
import {
  fetchProtectedJson,
  getCurrentUser,
  isUnauthorizedError,
  type AuthUser,
} from '../../lib/authApi';
import { clearAuthToken, subscribeAuthTokenChange } from '../../lib/authStorage';

type HistoryStatus = 'loading' | 'unauthorized' | 'ready' | 'error';

type HistoryAttempt = {
  attemptId: string;
  examId: string;
  examTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  unansweredCount: number;
  durationSeconds: number | null;
  submittedAt: string;
};

type HistorySummary = {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
};

type UserAttemptsResponse = {
  attempts: HistoryAttempt[];
  summary: HistorySummary;
};

const EMPTY_SUMMARY: HistorySummary = {
  totalAttempts: 0,
  averageScore: 0,
  bestScore: 0,
};

const formatSubmittedAt = (submittedAt: string): string => {
  return new Date(submittedAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDuration = (durationSeconds: number | null): string => {
  if (durationSeconds === null) {
    return 'Không lưu thời gian';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}p ${seconds.toString().padStart(2, '0')}s`;
};

export function HistoryClient() {
  const [status, setStatus] = useState<HistoryStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [summary, setSummary] = useState<HistorySummary>(EMPTY_SUMMARY);
  const [attempts, setAttempts] = useState<HistoryAttempt[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const resetHistory = () => {
      setSummary(EMPTY_SUMMARY);
      setAttempts([]);
    };

    const loadHistory = async () => {
      try {
        setStatus('loading');
        setErrorMessage(null);

        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!currentUser) {
          setUser(null);
          resetHistory();
          setStatus('unauthorized');
          return;
        }

        setUser(currentUser);

        const response = await fetchProtectedJson<UserAttemptsResponse>(
          '/api/me/attempts?limit=20&sort=latest',
        );

        if (!isMounted) {
          return;
        }

        setSummary(response.summary ?? EMPTY_SUMMARY);
        setAttempts(Array.isArray(response.attempts) ? response.attempts : []);
        setStatus('ready');
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

        if (isUnauthorizedError(error)) {
          setUser(null);
          resetHistory();
          setStatus('unauthorized');
          setErrorMessage(null);
          return;
        }

        setErrorMessage('Không tải được lịch sử làm bài. Hãy thử lại sau.');
        setStatus('error');
      }
    };

    void loadHistory();
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => {
      void loadHistory();
    });

    return () => {
      isMounted = false;
      unsubscribeAuthTokenChange();
    };
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setSummary(EMPTY_SUMMARY);
    setAttempts([]);
    setStatus('unauthorized');
    setErrorMessage(null);
  };

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl animate-fade-in flex-col gap-6">
        <header className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              aria-label="Về trang chủ"
              className="group inline-flex cursor-pointer items-center gap-3 rounded-lg text-sm font-semibold text-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Logo className="h-9 w-9 transition-transform group-hover:scale-105" />
              <span className="transition-colors group-hover:text-primary">ManMath</span>
            </Link>

            <p className="mt-6 text-sm font-semibold text-primary">History</p>
            <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-text-primary">
              Lịch sử làm bài
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Xem lại toàn bộ các lần luyện đề của bạn, từ điểm số cho đến từng
              lần nộp bài gần đây.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Quay về danh sách đề
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Hồ sơ
            </Link>
            <Link
              href="/analytics"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Phân tích học tập
            </Link>

            {status === 'ready' && user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Đăng xuất
              </button>
            ) : null}
          </div>
        </header>

        {status === 'loading' && (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border bg-surface p-5 shadow-card"
                >
                  <div className="h-4 w-24 animate-pulse rounded bg-background-alt" />
                  <div className="mt-3 h-8 w-20 animate-pulse rounded bg-background-alt" />
                </div>
              ))}
            </section>
            <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <div className="h-5 w-44 animate-pulse rounded bg-background-alt" />
              <div className="mt-4 space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="rounded-lg bg-background p-4">
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-56 animate-pulse rounded bg-slate-100" />
                    <div className="mt-3 h-3 w-40 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {status === 'unauthorized' && (
          <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 10V7a5 5 0 0 1 10 0v3M6.5 10h11A1.5 1.5 0 0 1 19 11.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="mt-5 font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
              Bạn cần đăng nhập để xem lịch sử làm bài.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
              Hãy đăng nhập bằng Google ở trang danh sách đề để xem toàn bộ các
              lần luyện đề đã lưu.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Quay về danh sách đề
            </Link>
          </section>
        )}

        {status === 'error' && (
          <section className="rounded-xl border border-error-border bg-surface p-6 shadow-card">
            <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-error">
              Không tải được lịch sử
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{errorMessage}</p>
          </section>
        )}

        {status === 'ready' && (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border border-t-[3px] border-t-primary bg-surface p-5 shadow-card">
                <p className="text-xs font-semibold text-text-secondary">Tổng số lần làm</p>
                <p className="mt-2 text-3xl font-bold text-primary">
                  {summary.totalAttempts}
                </p>
              </div>
              <div className="rounded-xl border border-border border-t-[3px] border-t-primary bg-surface p-5 shadow-card">
                <p className="text-xs font-semibold text-text-secondary">Điểm trung bình</p>
                <p className="mt-2 text-3xl font-bold text-primary">
                  {summary.averageScore.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl border border-border border-t-[3px] border-t-success bg-surface p-5 shadow-card">
                <p className="text-xs font-semibold text-text-secondary">Điểm tốt nhất</p>
                <p className="mt-2 text-3xl font-bold text-success">
                  {summary.bestScore.toFixed(1)}
                </p>
              </div>
            </section>

            {attempts.length === 0 ? (
              <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
                <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
                  Bạn chưa có lịch sử luyện đề.
                </h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                  Hãy làm một đề để bắt đầu lưu lịch sử, xem lại attempt detail và
                  theo dõi tiến độ học tập.
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Đi đến danh sách đề
                </Link>
              </section>
            ) : (
              <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                      Các lần làm gần đây
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Mở chi tiết attempt hoặc làm lại đề từ lịch sử học tập của bạn.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
                    {attempts.length} attempt
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {attempts.map((attempt) => (
                    <div
                      key={attempt.attemptId}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            {attempt.examTitle}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {formatSubmittedAt(attempt.submittedAt)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
                            <span>
                              {attempt.correctCount}/{attempt.totalQuestions} câu đúng
                            </span>
                            <span>{attempt.unansweredCount} câu bỏ trống</span>
                            <span>{formatDuration(attempt.durationSeconds)}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
                            {attempt.score.toFixed(1)} điểm
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/attempts/${attempt.attemptId}`}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              Xem chi tiết
                            </Link>
                            <Link
                              href={`/exam/${attempt.examId}`}
                              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              Làm lại đề
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
