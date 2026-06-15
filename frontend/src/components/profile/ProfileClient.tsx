'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '../exam/Logo';
import { UserTopicStatsCard } from '../exam/UserTopicStatsCard';
import {
  fetchProtectedJson,
  getCurrentUser,
  isUnauthorizedError,
  type AuthUser,
} from '../../lib/authApi';
import { clearAuthToken, subscribeAuthTokenChange } from '../../lib/authStorage';

type ProfileStatus = 'loading' | 'unauthorized' | 'ready' | 'error';

type RecommendedExam = {
  examId: string;
  title: string;
  durationMinutes: number;
  matchedWeakTopicCount: number;
  matchedWeakQuestionCount: number;
  reason: string;
};

type RecommendationsResponse = {
  weakTopics: Array<{
    topicId: string | null;
    topicName: string;
    topicSlug: string | null;
    correct: number;
    total: number;
    accuracy: number;
    reason: string;
  }>;
  recommendedExams: RecommendedExam[];
};

type RecentAttempt = {
  attemptId: string;
  examId: string;
  examTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
};

type ProgressResponse = {
  summary: {
    attemptCount: number;
    averageScore: number;
    bestScore: number;
    latestScore: number | null;
  };
  recentAttempts: RecentAttempt[];
  progressByAttempt: Array<{
    attemptId: string;
    examTitle: string;
    score: number;
    accuracy: number;
    submittedAt: string;
  }>;
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

export function ProfileClient() {
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recommendedExam, setRecommendedExam] = useState<RecommendedExam | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setStatus('loading');
        setErrorMessage(null);

        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!currentUser) {
          setUser(null);
          setStatus('unauthorized');
          return;
        }

        setUser(currentUser);
        setRecommendedExam(null);
        setRecentAttempts([]);

        try {
          const [recommendationResult, progressResult] = await Promise.allSettled([
            fetchProtectedJson<RecommendationsResponse>('/api/me/recommendations'),
            fetchProtectedJson<ProgressResponse>('/api/me/progress'),
          ]);

          if (!isMounted) {
            return;
          }

          const hasUnauthorized =
            (recommendationResult.status === 'rejected' &&
              isUnauthorizedError(recommendationResult.reason)) ||
            (progressResult.status === 'rejected' &&
              isUnauthorizedError(progressResult.reason));

          if (hasUnauthorized) {
            setUser(null);
            setRecommendedExam(null);
            setRecentAttempts([]);
            setStatus('unauthorized');
            setErrorMessage(null);
            return;
          }

          if (recommendationResult.status === 'fulfilled') {
            const nextRecommendedExam = Array.isArray(
              recommendationResult.value.recommendedExams,
            )
              ? recommendationResult.value.recommendedExams[0] ?? null
              : null;

            setRecommendedExam(nextRecommendedExam);
          } else {
            setRecommendedExam(null);
          }

          if (progressResult.status === 'fulfilled') {
            setRecentAttempts(
              Array.isArray(progressResult.value.recentAttempts)
                ? progressResult.value.recentAttempts.slice(0, 3)
                : [],
            );
          } else {
            setRecentAttempts([]);
          }
        } catch {
          if (!isMounted) {
            return;
          }

          setRecommendedExam(null);
          setRecentAttempts([]);
        }

        setStatus('ready');
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

        if (isUnauthorizedError(error)) {
          setUser(null);
          setRecentAttempts([]);
          setStatus('unauthorized');
          setErrorMessage(null);
          return;
        }

        setErrorMessage('Không tải được hồ sơ. Hãy thử lại sau.');
        setStatus('error');
      }
    };

    void loadProfile();
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => {
      void loadProfile();
    });

    return () => {
      isMounted = false;
      unsubscribeAuthTokenChange();
    };
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setRecommendedExam(null);
    setRecentAttempts([]);
    setStatus('unauthorized');
    setErrorMessage(null);
  };

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl animate-fade-in flex-col gap-6">
        <header className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              aria-label="Về trang chủ"
              className="group inline-flex cursor-pointer items-center gap-3 rounded-lg text-sm font-semibold text-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Logo className="h-9 w-9 transition-transform group-hover:scale-105" />
              <span className="transition-colors group-hover:text-primary">
                ManMath
              </span>
            </Link>

            <p className="mt-6 text-sm font-semibold text-primary">Tài khoản</p>
            <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-text-primary">
              Hồ sơ người dùng
            </h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Xem thông tin đăng nhập hiện tại của bạn trên ManMath.
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
              href="/analytics"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Phân tích học tập
            </Link>
            <Link
              href="/history"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Lịch sử làm bài
            </Link>
          </div>
        </header>

        {status === 'loading' && (
          <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-full bg-background-alt" />
              <div className="min-w-0 flex-1">
                <div className="h-5 w-40 animate-pulse rounded bg-background-alt" />
                <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-background-alt" />
              </div>
            </div>
          </section>
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
              Bạn cần đăng nhập để xem hồ sơ.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
              Hãy đăng nhập bằng Google ở trang danh sách đề để xem thông tin tài khoản.
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
              Không tải được hồ sơ
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {errorMessage}
            </p>
          </section>
        )}

        {status === 'ready' && user && (
          <>
            <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-20 w-20 rounded-full border border-border object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary">
                    {(user.fullName ?? user.email).charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Đang đăng nhập
                  </p>
                  <h2 className="mt-1 truncate font-[family-name:var(--font-outfit)] text-2xl font-bold text-text-primary">
                    {user.fullName ?? 'Người dùng ManMath'}
                  </h2>
                  <p className="mt-2 truncate text-sm text-text-secondary">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-semibold text-text-primary">
                  Trạng thái đăng nhập
                </p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Tài khoản này đang dùng Google Login và JWT Access Token của ManMath.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Quay về danh sách đề
                </Link>
                <Link
                  href="/analytics"
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Xem analytics
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Đăng xuất
                </button>
              </div>
            </section>

            {recommendedExam && (
              <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Gợi ý tiếp theo
                  </p>
                  <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
                    Đề nên làm tiếp
                  </h2>
                  <p className="text-sm leading-6 text-text-secondary">
                    Một gợi ý nhanh dựa trên các chuyên đề bạn đang cần ôn lại.
                  </p>
                </div>

                <div className="mt-5 rounded-lg border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {recommendedExam.title}
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    {recommendedExam.durationMinutes} phút
                    {recommendedExam.matchedWeakQuestionCount > 0
                      ? ` · ${recommendedExam.matchedWeakQuestionCount} câu bám topic yếu`
                      : ''}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    {recommendedExam.reason}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/exam/${recommendedExam.examId}`}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Làm đề này
                  </Link>
                  <Link
                    href="/analytics"
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Xem phân tích chi tiết
                  </Link>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Hoạt động
                  </p>
                  <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
                    Hoạt động gần đây
                  </h2>
                  <p className="text-sm leading-6 text-text-secondary">
                    Ba lần làm bài gần nhất để bạn quay lại xem nhanh kết quả.
                  </p>
                </div>

                <Link
                  href="/analytics"
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Xem analytics
                </Link>
              </div>

              {recentAttempts.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-border bg-background p-4">
                  <p className="text-sm font-semibold text-text-primary">
                    Bạn chưa có hoạt động luyện đề nào.
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Hãy làm một đề để bắt đầu lưu lịch sử và theo dõi tiến độ học tập.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {recentAttempts.map((attempt) => (
                    <Link
                      key={attempt.attemptId}
                      href={`/attempts/${attempt.attemptId}`}
                      className="block rounded-lg border border-border bg-background p-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            {attempt.examTitle}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {formatSubmittedAt(attempt.submittedAt)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
                          {attempt.score.toFixed(1)} điểm
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-text-secondary">
                        {attempt.correctCount}/{attempt.totalQuestions} câu đúng
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <UserTopicStatsCard />
          </>
        )}
      </div>
    </main>
  );
}
