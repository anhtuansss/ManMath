'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Logo } from '../exam/Logo';
import {
  fetchProtectedJson,
  getCurrentUser,
  isUnauthorizedError,
  type AuthUser,
} from '../../lib/authApi';
import { clearAuthToken, subscribeAuthTokenChange } from '../../lib/authStorage';
import type { TopicStatDto } from '../exam/types';

type RecommendationWeakTopic = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
  accuracy: number;
  reason: string;
};

type RecommendedExam = {
  examId: string;
  title: string;
  durationMinutes: number;
  matchedWeakTopicCount: number;
  matchedWeakQuestionCount: number;
  reason: string;
};

type TopicStatsResponse = {
  topicStats: TopicStatDto[];
};

type SubtopicStat = {
  subtopicSlug: string;
  subtopicName: string;
  topicSlug: string;
  topicName: string;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  weak: boolean;
};

type SubtopicStatsResponse = {
  subtopicStats: SubtopicStat[];
};

type RecommendationsResponse = {
  weakTopics: RecommendationWeakTopic[];
  recommendedExams: RecommendedExam[];
};

type ProgressSummary = {
  attemptCount: number;
  averageScore: number;
  bestScore: number;
  latestScore: number | null;
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

type ProgressByAttempt = {
  attemptId: string;
  examTitle: string;
  score: number;
  accuracy: number;
  submittedAt: string;
};

type ProgressResponse = {
  summary: ProgressSummary;
  recentAttempts: RecentAttempt[];
  progressByAttempt: ProgressByAttempt[];
};

type AnalyticsStatus = 'loading' | 'unauthorized' | 'ready' | 'error';

const MAX_VISIBLE_TOPICS = 5;
const EMPTY_PROGRESS_SUMMARY: ProgressSummary = {
  attemptCount: 0,
  averageScore: 0,
  bestScore: 0,
  latestScore: null,
};

const clampAccuracy = (accuracy: number): number => {
  return Math.min(Math.max(accuracy, 0), 100);
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

const sortWeakTopics = (topicStats: TopicStatDto[]): TopicStatDto[] => {
  return [...topicStats]
    .filter((topic) => topic.total > 0)
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return a.accuracy - b.accuracy;
      }

      if (a.total !== b.total) {
        return b.total - a.total;
      }

      return a.topicName.localeCompare(b.topicName, 'vi');
    })
    .slice(0, MAX_VISIBLE_TOPICS);
};

const sortStrongTopics = (topicStats: TopicStatDto[]): TopicStatDto[] => {
  return [...topicStats]
    .filter((topic) => topic.total > 0)
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }

      if (a.total !== b.total) {
        return b.total - a.total;
      }

      return a.topicName.localeCompare(b.topicName, 'vi');
    })
    .slice(0, MAX_VISIBLE_TOPICS);
};

export function AnalyticsClient() {
  const [status, setStatus] = useState<AnalyticsStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [topicStats, setTopicStats] = useState<TopicStatDto[]>([]);
  const [subtopicStats, setSubtopicStats] = useState<SubtopicStat[]>([]);
  const [progressSummary, setProgressSummary] =
    useState<ProgressSummary>(EMPTY_PROGRESS_SUMMARY);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [progressByAttempt, setProgressByAttempt] = useState<ProgressByAttempt[]>(
    [],
  );
  const [recommendedExams, setRecommendedExams] = useState<RecommendedExam[]>([]);
  const [recommendationWeakTopics, setRecommendationWeakTopics] = useState<
    RecommendationWeakTopic[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const resetAnalytics = () => {
      setTopicStats([]);
      setSubtopicStats([]);
      setProgressSummary(EMPTY_PROGRESS_SUMMARY);
      setRecentAttempts([]);
      setProgressByAttempt([]);
      setRecommendedExams([]);
      setRecommendationWeakTopics([]);
    };

    const loadAnalytics = async () => {
      try {
        setStatus('loading');
        setErrorMessage(null);

        const currentUser = await getCurrentUser();

        if (!isMounted) {
          return;
        }

        if (!currentUser) {
          setUser(null);
          resetAnalytics();
          setStatus('unauthorized');
          return;
        }

        setUser(currentUser);

        const [
          topicStatsResult,
          subtopicStatsResult,
          progressResult,
          recommendationResult,
        ] =
          await Promise.allSettled([
            fetchProtectedJson<TopicStatsResponse>('/api/me/topic-stats'),
            fetchProtectedJson<SubtopicStatsResponse>('/api/me/subtopic-stats'),
            fetchProtectedJson<ProgressResponse>('/api/me/progress'),
            fetchProtectedJson<RecommendationsResponse>('/api/me/recommendations'),
          ]);

        if (!isMounted) {
          return;
        }

        const hasUnauthorized =
          (topicStatsResult.status === 'rejected' &&
            isUnauthorizedError(topicStatsResult.reason)) ||
          (subtopicStatsResult.status === 'rejected' &&
            isUnauthorizedError(subtopicStatsResult.reason)) ||
          (progressResult.status === 'rejected' &&
            isUnauthorizedError(progressResult.reason)) ||
          (recommendationResult.status === 'rejected' &&
            isUnauthorizedError(recommendationResult.reason));

        if (hasUnauthorized) {
          setUser(null);
          resetAnalytics();
          setStatus('unauthorized');
          return;
        }

        if (topicStatsResult.status === 'rejected') {
          throw topicStatsResult.reason;
        }

        if (progressResult.status === 'rejected') {
          throw progressResult.reason;
        }

        setTopicStats(
          Array.isArray(topicStatsResult.value.topicStats)
            ? topicStatsResult.value.topicStats
            : [],
        );
        setSubtopicStats(
          subtopicStatsResult.status === 'fulfilled' &&
            Array.isArray(subtopicStatsResult.value.subtopicStats)
            ? subtopicStatsResult.value.subtopicStats
            : [],
        );
        setProgressSummary(progressResult.value.summary ?? EMPTY_PROGRESS_SUMMARY);
        setRecentAttempts(
          Array.isArray(progressResult.value.recentAttempts)
            ? progressResult.value.recentAttempts
            : [],
        );
        setProgressByAttempt(
          Array.isArray(progressResult.value.progressByAttempt)
            ? progressResult.value.progressByAttempt
            : [],
        );

        if (recommendationResult.status === 'fulfilled') {
          setRecommendedExams(
            Array.isArray(recommendationResult.value.recommendedExams)
              ? recommendationResult.value.recommendedExams
              : [],
          );
          setRecommendationWeakTopics(
            Array.isArray(recommendationResult.value.weakTopics)
              ? recommendationResult.value.weakTopics
              : [],
          );
        } else {
          setRecommendedExams([]);
          setRecommendationWeakTopics([]);
        }

        setStatus('ready');
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

        if (isUnauthorizedError(error)) {
          setUser(null);
          resetAnalytics();
          setStatus('unauthorized');
          setErrorMessage(null);
          return;
        }

        setErrorMessage('Không tải được phân tích học tập. Hãy thử lại sau.');
        setStatus('error');
      }
    };

    void loadAnalytics();
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => {
      void loadAnalytics();
    });

    return () => {
      isMounted = false;
      unsubscribeAuthTokenChange();
    };
  }, []);

  const weakTopics = useMemo(() => {
    if (recommendationWeakTopics.length > 0) {
      return recommendationWeakTopics.slice(0, MAX_VISIBLE_TOPICS);
    }

    return sortWeakTopics(topicStats).map((topic) => ({
      ...topic,
      reason: 'Đây là một trong những chuyên đề có tỷ lệ đúng thấp hơn của bạn.',
    }));
  }, [recommendationWeakTopics, topicStats]);

  const strongTopics = useMemo(() => sortStrongTopics(topicStats), [topicStats]);
  const weakSubtopics = useMemo(() => {
    return [...subtopicStats]
      .filter((subtopic) => subtopic.totalAnswers > 0)
      .sort((a, b) => {
        if (a.weak !== b.weak) {
          return a.weak ? -1 : 1;
        }

        if (a.accuracy !== b.accuracy) {
          return a.accuracy - b.accuracy;
        }

        if (a.totalAnswers !== b.totalAnswers) {
          return b.totalAnswers - a.totalAnswers;
        }

        return a.subtopicName.localeCompare(b.subtopicName, 'vi');
      })
      .slice(0, MAX_VISIBLE_TOPICS);
  }, [subtopicStats]);

  const hasAnalyticsData =
    progressSummary.attemptCount > 0 ||
    topicStats.some((topic) => topic.total > 0) ||
    subtopicStats.some((subtopic) => subtopic.totalAnswers > 0) ||
    recommendedExams.length > 0;

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setTopicStats([]);
    setSubtopicStats([]);
    setProgressSummary(EMPTY_PROGRESS_SUMMARY);
    setRecentAttempts([]);
    setProgressByAttempt([]);
    setRecommendedExams([]);
    setRecommendationWeakTopics([]);
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
              <span className="transition-colors group-hover:text-primary">
                ManMath
              </span>
            </Link>

            <p className="mt-6 text-sm font-semibold text-primary">Analytics</p>
            <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-text-primary">
              Phân tích học tập
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Theo dõi các chuyên đề bạn đang mạnh, đang yếu và xem lại tiến độ
              gần đây để biết mình có đang tiến bộ hay không.
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
              href="/history"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Lịch sử làm bài
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
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border bg-surface p-5 shadow-card"
                >
                  <div className="h-4 w-24 animate-pulse rounded bg-background-alt" />
                  <div className="mt-3 h-8 w-20 animate-pulse rounded bg-background-alt" />
                </div>
              ))}
            </section>
            <div className="grid gap-6 lg:grid-cols-2">
              {[0, 1].map((item) => (
                <section
                  key={item}
                  className="rounded-xl border border-border bg-surface p-5 shadow-card"
                >
                  <div className="h-5 w-40 animate-pulse rounded bg-background-alt" />
                  <div className="mt-4 space-y-3">
                    {[0, 1, 2].map((line) => (
                      <div key={line} className="rounded-lg bg-background p-3">
                        <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                        <div className="mt-2 h-2 animate-pulse rounded-full bg-slate-100" />
                        <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
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
              Bạn cần đăng nhập để xem phân tích học tập.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
              Hãy đăng nhập bằng Google ở trang danh sách đề để xem chuyên đề mạnh,
              chuyên đề yếu, đề gợi ý tiếp theo và tiến độ làm bài gần đây.
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
              Không tải được analytics
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {errorMessage}
            </p>
          </section>
        )}

        {status === 'ready' && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border border-t-[3px] border-t-primary bg-surface p-5 shadow-card">
                <p className="text-xs font-semibold text-text-secondary">
                  Tổng số lần làm
                </p>
                <p className="mt-2 text-3xl font-bold text-primary">
                  {progressSummary.attemptCount}
                </p>
              </div>
              <div className="rounded-xl border border-border border-t-[3px] border-t-primary bg-surface p-5 shadow-card">
                <p className="text-xs font-semibold text-text-secondary">
                  Điểm trung bình
                </p>
                <p className="mt-2 text-3xl font-bold text-primary">
                  {progressSummary.averageScore.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl border border-border border-t-[3px] border-t-success bg-surface p-5 shadow-card">
                <p className="text-xs font-semibold text-text-secondary">
                  Điểm tốt nhất
                </p>
                <p className="mt-2 text-3xl font-bold text-success">
                  {progressSummary.bestScore.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl border border-border border-t-[3px] border-t-accent bg-surface p-5 shadow-card">
                <p className="text-xs font-semibold text-text-secondary">
                  Điểm gần nhất
                </p>
                <p className="mt-2 text-3xl font-bold text-accent">
                  {progressSummary.latestScore !== null
                    ? progressSummary.latestScore.toFixed(1)
                    : '--'}
                </p>
              </div>
            </section>

            {!hasAnalyticsData && (
              <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
                <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
                  Chưa có đủ dữ liệu
                </h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                  Hãy làm một đề để bắt đầu phân tích. Khi đã có dữ liệu, ManMath sẽ
                  hiển thị tiến độ theo thời gian, chuyên đề mạnh, chuyên đề yếu và
                  đề nên làm tiếp.
                </p>
              </section>
            )}

            {progressSummary.attemptCount > 0 && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                        Tiến độ gần đây
                      </h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        Theo dõi 10 lần làm gần nhất để xem mức độ ổn định.
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
                      {progressByAttempt.length} lần
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {progressByAttempt.map((attempt, index) => (
                      <div
                        key={attempt.attemptId}
                        className="rounded-lg border border-border bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">
                              Lần {index + 1} · {attempt.examTitle}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {formatSubmittedAt(attempt.submittedAt)}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-text-primary">
                              {attempt.score.toFixed(1)} điểm
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {attempt.accuracy}% đúng
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-alt">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${clampAccuracy(attempt.accuracy)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                        Các lần làm gần nhất
                      </h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        Mở nhanh từng bài đã làm để xem lại kết quả chi tiết.
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
                      {recentAttempts.length} lần
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {recentAttempts.map((attempt) => (
                      <Link
                        key={attempt.attemptId}
                        href={`/attempts/${attempt.attemptId}`}
                        className="block rounded-lg border border-border bg-background p-3 transition-colors duration-200 hover:border-primary/30 hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

                        <p className="mt-3 text-xs leading-5 text-text-secondary">
                          {attempt.correctCount}/{attempt.totalQuestions} câu đúng
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            )}

            <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                    Phân tích chuyên đề nhỏ
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Xem các mảng kiến thức nhỏ cần ôn kỹ hơn trong từng chuyên đề.
                  </p>
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
                  Top {weakSubtopics.length}
                </span>
              </div>

              {weakSubtopics.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  Chưa có đủ dữ liệu subtopic. Hãy làm thêm các đề đã được gắn subtopic để xem phân tích chi tiết hơn.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {weakSubtopics.map((subtopic) => {
                    const accuracy = clampAccuracy(subtopic.accuracy);

                    return (
                      <div
                        key={subtopic.subtopicSlug}
                        className="rounded-lg border border-border bg-background p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">
                              {subtopic.subtopicName}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                              {subtopic.topicName} · {subtopic.correctAnswers}/{subtopic.totalAnswers} câu đúng
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              subtopic.weak
                                ? 'border-warning/30 bg-warning/10 text-warning'
                                : 'border-success-border bg-success-light text-success'
                            }`}
                          >
                            {accuracy}%
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-alt">
                          <div
                            className={`h-full rounded-full ${
                              subtopic.weak ? 'bg-warning' : 'bg-success'
                            }`}
                            style={{ width: `${accuracy}%` }}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {subtopic.weak ? (
                            <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                              Cần ôn lại
                            </span>
                          ) : (
                            <span className="rounded-full border border-success-border bg-success-light px-2.5 py-1 text-xs font-semibold text-success">
                              Đang ổn định
                            </span>
                          )}

                          <Link
                            href={`/practice/topic/${subtopic.topicSlug}`}
                            className="inline-flex h-7 items-center justify-center rounded-full border border-border bg-surface px-2.5 text-xs font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            Luyện topic
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                      Chuyên đề yếu
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Những chuyên đề nên ưu tiên ôn lại trước.
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
                    Top {weakTopics.length}
                  </span>
                </div>

                {weakTopics.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-text-secondary">
                    Chưa có chuyên đề yếu rõ ràng để hiển thị.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {weakTopics.map((topic) => {
                      const accuracy = clampAccuracy(topic.accuracy);

                      return (
                        <div
                          key={topic.topicId ?? topic.topicName}
                          className="rounded-lg border border-border bg-background p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {topic.topicName}
                              </p>
                              <p className="mt-1 text-xs text-text-secondary">
                                {topic.correct}/{topic.total} câu đúng
                              </p>
                            </div>

                            <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
                              {accuracy}%
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-alt">
                            <div
                              className="h-full rounded-full bg-warning"
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>

                          <p className="mt-3 text-xs leading-5 text-text-secondary">
                            {topic.reason}
                          </p>

                          {topic.topicSlug ? (
                            <div className="mt-3">
                              <Link
                                href={`/practice/topic/${topic.topicSlug}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              >
                                Luyện chuyên đề này
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                      Chuyên đề mạnh
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Các nhóm kiến thức bạn đang làm tốt hơn.
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
                    Top {strongTopics.length}
                  </span>
                </div>

                {strongTopics.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-text-secondary">
                    Chưa có đủ dữ liệu để xác định chuyên đề mạnh.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {strongTopics.map((topic) => {
                      const accuracy = clampAccuracy(topic.accuracy);

                      return (
                        <div
                          key={topic.topicId ?? topic.topicName}
                          className="rounded-lg border border-border bg-background p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {topic.topicName}
                              </p>
                              <p className="mt-1 text-xs text-text-secondary">
                                {topic.correct}/{topic.total} câu đúng
                              </p>
                            </div>

                            <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
                              {accuracy}%
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-alt">
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                    Đề nên làm tiếp
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Chọn nhanh một đề phù hợp với các chuyên đề bạn cần cải thiện.
                  </p>
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
                  {recommendedExams.length} đề
                </span>
              </div>

              {recommendedExams.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-text-secondary">
                  Chưa có đề gợi ý riêng cho bạn. Hãy tiếp tục làm bài để hệ thống có
                  thêm dữ liệu.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {recommendedExams.map((exam) => (
                    <Link
                      key={exam.examId}
                      href={`/exam/${exam.examId}`}
                      className="rounded-lg border border-border bg-background p-4 transition-colors duration-200 hover:border-primary/30 hover:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <p className="line-clamp-2 text-sm font-semibold leading-5 text-text-primary">
                        {exam.title}
                      </p>
                      <p className="mt-2 text-xs text-text-secondary">
                        {exam.durationMinutes} phút
                        {exam.matchedWeakQuestionCount > 0
                          ? ` · ${exam.matchedWeakQuestionCount} câu bám topic yếu`
                          : ''}
                      </p>
                      <p className="mt-3 text-xs leading-5 text-text-secondary">
                        {exam.reason}
                      </p>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Quay về danh sách đề
                </Link>
                {recommendedExams[0] ? (
                  <Link
                    href={`/exam/${recommendedExams[0].examId}`}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Làm đề được gợi ý
                  </Link>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
