'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import {
  fetchProtectedJson,
  isUnauthorizedError,
} from '../../lib/authApi';
import { useFetch } from '../../lib/useFetch';
import { subscribeAuthTokenChange } from '../../lib/authStorage';
import type { ExamAttemptSummaryDto } from './types';

type ExamAttemptsClientProps = {
  examId: string;
};

const formatSubmittedAt = (submittedAt: string) => {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(submittedAt));
};

const formatDurationSeconds = (durationSeconds: number | null) => {
  if (durationSeconds === null) {
    return 'Chưa ghi nhận';
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }

  return `${seconds} giây`;
};

export function ExamAttemptsClient({ examId }: ExamAttemptsClientProps) {
  const { data: attemptsData, loading, error, refetch } = useFetch(
    () => fetchProtectedJson<ExamAttemptSummaryDto[]>(`/api/exams/${examId}/attempts`),
    [examId]
  );

  const attempts = attemptsData ?? [];
  const isUnauthorized = error !== null && error.toLowerCase().includes('đăng nhập');

  useEffect(() => {
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => {
      void refetch();
    });

    return () => {
      unsubscribeAuthTokenChange();
    };
  }, [refetch]);

  const latestAttempt = attempts[0] ?? null;

  const bestAttempt = attempts.reduce<ExamAttemptSummaryDto | null>(
    (best, attempt) => {
      if (!best) return attempt;

      if (attempt.score > best.score) {
        return attempt;
      }

      if (
        attempt.score === best.score &&
        new Date(attempt.submittedAt).getTime() >
          new Date(best.submittedAt).getTime()
      ) {
        return attempt;
      }

      return best;
    },
    null,
  );

  const averageScore =
    attempts.length > 0
      ? attempts.reduce((total, attempt) => total + attempt.score, 0) /
        attempts.length
      : 0;

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl animate-fade-in flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              aria-label="Về trang chủ"
              className="group inline-flex cursor-pointer items-center gap-3 rounded-lg text-sm font-semibold text-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Logo className="h-9 w-9 transition-transform group-hover:scale-105" />
              <span className="transition-colors group-hover:text-primary">ManMath</span>
            </Link>

            <p className="mt-6 text-sm font-semibold text-primary">
              Lịch sử làm bài
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-text-primary">
              Các lần làm đề
            </h1>
          </div>

          <Link
            href={`/exam/${examId}`}
            className="inline-flex h-10 cursor-pointer items-center gap-2 justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 12L2 8l4-4M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quay lại đề
          </Link>
        </header>

        {loading && (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <div className="h-3 w-28 animate-pulse rounded bg-background-alt" />
                  <div className="mt-3 h-7 w-20 animate-pulse rounded bg-background-alt" />
                  <div className="mt-2 h-4 w-36 animate-pulse rounded bg-background-alt" />
                  <div className="mt-4 h-4 w-24 animate-pulse rounded bg-primary-light" />
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <div className="border-b border-border px-5 py-4">
                <div className="h-5 w-40 animate-pulse rounded bg-background-alt" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b border-border px-5 py-4 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded bg-background-alt" />
                      <div className="h-3 w-36 animate-pulse rounded bg-background-alt" />
                      <div className="flex gap-2">
                        <div className="h-6 w-20 animate-pulse rounded-md bg-background-alt" />
                        <div className="h-6 w-20 animate-pulse rounded-md bg-primary-light" />
                        <div className="h-6 w-24 animate-pulse rounded-md bg-success-light" />
                      </div>
                    </div>
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-primary-light" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {isUnauthorized && (
          <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 10V7a5 5 0 0110 0v3M6.5 10h11A1.5 1.5 0 0119 11.5v7A1.5 1.5 0 0117.5 20h-11A1.5 1.5 0 015 18.5v-7A1.5 1.5 0 016.5 10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="mt-5 font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
              Bạn cần đăng nhập để xem lịch sử làm bài.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
              Hãy đăng nhập để xem các lần làm bài đã lưu của bạn.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Về danh sách đề
              </Link>
              <Link
                href={`/exam/${examId}`}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Quay lại đề
              </Link>
            </div>
          </section>
        )}

        {error && !isUnauthorized && (
          <section className="rounded-xl border border-error-border bg-surface p-6 shadow-card">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-light">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-error" aria-hidden="true">
                  <path d="M10 7v4m0 2h.01M17 10a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-error">
                  Không tải được dữ liệu
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{error}</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </section>
        )}

        {!loading && !error && attempts.length === 0 && (
          <section className="rounded-xl border border-border bg-surface p-8 shadow-card">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background-alt">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-muted" aria-hidden="true">
                  <path d="M9 5h6M9 9h6M9 13h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="mt-4 font-[family-name:var(--font-outfit)] text-lg font-bold text-text-primary">
                Chưa có lần làm bài nào
              </h2>
              <p className="mt-2 max-w-sm text-sm text-text-secondary">
                Sau khi bạn nộp bài, lịch sử làm bài của đề này sẽ xuất hiện ở đây.
              </p>
            </div>
          </section>
        )}

        {!loading && !error && attempts.length > 0 && (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border border-t-[3px] border-t-primary bg-surface p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-muted" aria-hidden="true">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-xs font-semibold text-text-secondary">
                    Lần làm gần nhất
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold text-text-primary">
                  {latestAttempt?.score}/10
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {latestAttempt ? formatSubmittedAt(latestAttempt.submittedAt) : 'Chưa có dữ liệu'}
                </p>
                {latestAttempt && (
                  <Link
                    href={`/attempts/${latestAttempt.id}`}
                    className="mt-4 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-hover"
                  >
                    Xem chi tiết
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                )}
              </div>

              <div className="rounded-xl border border-border border-t-[3px] border-t-success bg-surface p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-muted" aria-hidden="true">
                    <path d="M8 2l2 4 4 .5-3 3 .5 4L8 12l-3.5 1.5.5-4-3-3L6 6l2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-xs font-semibold text-text-secondary">
                    Điểm cao nhất
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold text-success">
                  {bestAttempt?.score}/10
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {bestAttempt
                    ? `${bestAttempt.correctCount}/${bestAttempt.totalQuestions} câu đúng`
                    : 'Chưa có dữ liệu'}
                </p>
                {bestAttempt && (
                  <Link
                    href={`/attempts/${bestAttempt.id}`}
                    className="mt-4 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-hover"
                  >
                    Xem bài tốt nhất
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                )}
              </div>

              <div className="rounded-xl border border-border border-t-[3px] border-t-text-secondary bg-surface p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-muted" aria-hidden="true">
                    <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <p className="text-xs font-semibold text-text-secondary">
                    Số lần làm
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold text-text-primary">
                  {attempts.length}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Điểm trung bình {averageScore.toFixed(1)}/10
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-text-primary">
                  Danh sách lần làm
                </h2>
              </div>

              <div className="divide-y divide-border">
                {attempts.map((attempt, index) => {
                  const accuracy = Math.round(
                    (attempt.correctCount / attempt.totalQuestions) * 100,
                  );

                  return (
                    <article
                      key={attempt.id}
                      className="grid gap-4 px-5 py-4 transition-colors duration-200 hover:bg-background-alt md:grid-cols-[1fr_auto] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          Lần làm #{attempts.length - index}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {formatSubmittedAt(attempt.submittedAt)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-md border border-border bg-background px-2.5 py-1 text-text-secondary">
                            Thời gian: {formatDurationSeconds(attempt.durationSeconds)}
                          </span>
                          <span className="rounded-md border border-primary-light bg-primary-50 px-2.5 py-1 text-primary">
                            {attempt.score}/10 điểm
                          </span>
                          <span className="rounded-md border border-success-border bg-success-light px-2.5 py-1 text-success">
                            {attempt.correctCount}/{attempt.totalQuestions} câu đúng
                          </span>
                          <span className="rounded-md border border-border bg-background px-2.5 py-1 text-text-secondary">
                            {accuracy}% chính xác
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/attempts/${attempt.id}`}
                        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        Xem chi tiết
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
