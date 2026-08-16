'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchProtectedJson,
  getCurrentUser,
  isUnauthorizedError,
} from '../../lib/authApi';
import { subscribeAuthTokenChange } from '../../lib/authStorage';
import { getExamTakingHref } from '../../lib/examRoutes';
import type {
  ProgressAttemptPoint as ProgressByAttempt,
  ProgressResponse,
  ProgressSummary,
  RecentAttempt,
  RecommendationsResponse,
  RecommendationWeakTopic,
  RecommendedExam,
  SubtopicStat,
  SubtopicStatsResponse,
  TopicStatsResponse,
  TopicStatDto,
} from '../../lib/apiTypes';

type AnalyticsStatus = 'loading' | 'unauthorized' | 'ready' | 'error';

const MAX_VISIBLE_TOPICS = 6;
const MINIMUM_TOPIC_SAMPLE = 3;
const EMPTY_PROGRESS_SUMMARY: ProgressSummary = {
  attemptCount: 0,
  averageScore: 0,
  bestScore: 0,
  latestScore: null,
};

const clampAccuracy = (accuracy: number): number => Math.min(Math.max(accuracy, 0), 100);

const formatSubmittedAt = (submittedAt: string): string =>
  new Date(submittedAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const getTopicPerformancePercentage = (topic: TopicStatDto): number =>
  topic.masteryPercentage ?? topic.accuracy;

const sortWeakTopics = (topicStats: TopicStatDto[]): TopicStatDto[] =>
  [...topicStats]
    .filter((topic) => topic.total > 0)
    .sort((a, b) => getTopicPerformancePercentage(a) - getTopicPerformancePercentage(b) || b.total - a.total || a.topicName.localeCompare(b.topicName, 'vi'));

const getTopicState = (topic: TopicStatDto): string => {
  if (topic.total < MINIMUM_TOPIC_SAMPLE) return 'Cần thêm dữ liệu';
  if (getTopicPerformancePercentage(topic) < 60) return 'Cần ôn';
  if (getTopicPerformancePercentage(topic) >= 80) return 'Ổn định';
  return 'Đang củng cố';
};

function TrendChart({ attempts, averageScore }: { attempts: ProgressByAttempt[]; averageScore: number }) {
  const chartAttempts = attempts.slice(0, 10);
  if (chartAttempts.length < 3) {
    return (
      <div className="border-y border-border py-6 text-sm leading-6 text-text-secondary">
        Làm thêm đề để ManMath xác định xu hướng.
      </div>
    );
  }

  const width = 560;
  const height = 168;
  const paddingX = 18;
  const paddingY = 20;
  const points = chartAttempts.map((attempt, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / (chartAttempts.length - 1);
    const y = height - paddingY - (Math.min(Math.max(attempt.score, 0), 10) / 10) * (height - paddingY * 2);
    return { x, y, score: attempt.score };
  });
  const pointString = points.map((point) => `${point.x},${point.y}`).join(' ');
  const averageY = height - paddingY - (Math.min(Math.max(averageScore, 0), 10) / 10) * (height - paddingY * 2);
  const scoreDelta = chartAttempts[chartAttempts.length - 1].score - chartAttempts[0].score;
  const trendText = scoreDelta >= 0.5 ? 'Điểm gần đây cao hơn lượt đầu trong chuỗi.' : scoreDelta <= -0.5 ? 'Điểm gần đây thấp hơn lượt đầu trong chuỗi.' : 'Điểm số đang khá ổn định trong các lượt gần đây.';

  return (
    <>
      <svg className="mt-5 h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ điểm của các lần làm gần đây">
        <line x1={paddingX} x2={width - paddingX} y1={averageY} y2={averageY} stroke="currentColor" strokeWidth="1" strokeDasharray="4 5" className="text-border-hover" />
        <polyline points={pointString} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
        {points.map((point, index) => <circle key={chartAttempts[index].attemptId} cx={point.x} cy={point.y} r="3.5" fill="currentColor" className="text-primary" />)}
      </svg>
      <p className="workspace-metadata mt-3">{trendText} Đường đứt là điểm trung bình {averageScore.toFixed(1)}.</p>
    </>
  );
}

export function AnalyticsClient() {
  const [status, setStatus] = useState<AnalyticsStatus>('loading');
  const [topicStats, setTopicStats] = useState<TopicStatDto[]>([]);
  const [subtopicStats, setSubtopicStats] = useState<SubtopicStat[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary>(EMPTY_PROGRESS_SUMMARY);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [progressByAttempt, setProgressByAttempt] = useState<ProgressByAttempt[]>([]);
  const [recommendedExams, setRecommendedExams] = useState<RecommendedExam[]>([]);
  const [recommendationWeakTopics, setRecommendationWeakTopics] = useState<RecommendationWeakTopic[]>([]);
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
        if (!isMounted) return;
        if (!currentUser) {
          resetAnalytics();
          setStatus('unauthorized');
          return;
        }
        const [topicStatsResult, subtopicStatsResult, progressResult, recommendationResult] = await Promise.allSettled([
          fetchProtectedJson<TopicStatsResponse>('/api/me/topic-stats'),
          fetchProtectedJson<SubtopicStatsResponse>('/api/me/subtopic-stats'),
          fetchProtectedJson<ProgressResponse>('/api/me/progress'),
          fetchProtectedJson<RecommendationsResponse>('/api/me/recommendations'),
        ]);
        if (!isMounted) return;
        const hasUnauthorized = [topicStatsResult, subtopicStatsResult, progressResult, recommendationResult]
          .some((result) => result.status === 'rejected' && isUnauthorizedError(result.reason));
        if (hasUnauthorized) {
          resetAnalytics();
          setStatus('unauthorized');
          return;
        }
        if (topicStatsResult.status === 'rejected') throw topicStatsResult.reason;
        if (progressResult.status === 'rejected') throw progressResult.reason;

        setTopicStats(Array.isArray(topicStatsResult.value.topicStats) ? topicStatsResult.value.topicStats : []);
        setSubtopicStats(subtopicStatsResult.status === 'fulfilled' && Array.isArray(subtopicStatsResult.value.subtopicStats) ? subtopicStatsResult.value.subtopicStats : []);
        setProgressSummary(progressResult.value.summary ?? EMPTY_PROGRESS_SUMMARY);
        setRecentAttempts(Array.isArray(progressResult.value.recentAttempts) ? progressResult.value.recentAttempts : []);
        setProgressByAttempt(Array.isArray(progressResult.value.progressByAttempt) ? progressResult.value.progressByAttempt : []);
        if (recommendationResult.status === 'fulfilled') {
          setRecommendedExams(Array.isArray(recommendationResult.value.recommendedExams) ? recommendationResult.value.recommendedExams : []);
          setRecommendationWeakTopics(Array.isArray(recommendationResult.value.weakTopics) ? recommendationResult.value.weakTopics : []);
        } else {
          setRecommendedExams([]);
          setRecommendationWeakTopics([]);
        }
        setStatus('ready');
      } catch (error: unknown) {
        if (!isMounted) return;
        if (isUnauthorizedError(error)) {
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
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => { void loadAnalytics(); });
    return () => {
      isMounted = false;
      unsubscribeAuthTokenChange();
    };
  }, []);

  const priorityTopics = useMemo(() => {
    const recommended = recommendationWeakTopics.filter((topic) => topic.total > 0).slice(0, 2);
    if (recommended.length > 0) return recommended;
    return sortWeakTopics(topicStats).slice(0, 2).map((topic) => ({ ...topic, reason: 'Đây là một trong những chuyên đề có tỷ lệ đúng thấp hơn của bạn.' }));
  }, [recommendationWeakTopics, topicStats]);
  const topicPerformance = useMemo(() => [...topicStats].filter((topic) => topic.total > 0).sort((a, b) => b.total - a.total || a.topicName.localeCompare(b.topicName, 'vi')).slice(0, MAX_VISIBLE_TOPICS), [topicStats]);
  const nextExam = recommendedExams[0] ?? null;
  const recentAttemptRows = recentAttempts.slice(0, 5);
  const latestAccuracy = recentAttempts[0] && recentAttempts[0].totalQuestions > 0
    ? Math.round((recentAttempts[0].correctCount / recentAttempts[0].totalQuestions) * 100)
    : null;
  const hasAnalyticsData = progressSummary.attemptCount > 0 || topicPerformance.length > 0 || subtopicStats.some((subtopic) => subtopic.totalAnswers > 0) || recommendedExams.length > 0;

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl animate-fade-in flex-col gap-6">
        <header className="border-b border-border pb-5">
          <p className="workspace-eyebrow">Phân tích học tập</p>
          <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="workspace-page-title text-text-primary">Bạn đang tiến bộ như thế nào?</h1>
              <p className="workspace-page-description mt-2">Xem điểm mạnh, phần cần ôn và xu hướng từ các lần làm gần đây.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {status === 'ready' && nextExam ? <Link href={getExamTakingHref(nextExam.examId)} className="workspace-button-text inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Làm đề được gợi ý</Link> : null}
              <Link href="/history" className="workspace-button-text inline-flex h-10 items-center justify-center text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem lịch sử</Link>
            </div>
          </div>
        </header>

        {status === 'loading' && <>
          <section className="rounded-xl border border-border bg-surface p-5 shadow-card"><div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="border-b border-border pb-4 last:border-b-0 sm:border-b-0 sm:border-r sm:pr-4 sm:last:border-r-0"><div className="h-4 w-24 animate-pulse rounded bg-background-alt" /><div className="mt-3 h-8 w-20 animate-pulse rounded bg-background-alt" /></div>)}</div></section>
          <div className="grid gap-6 lg:grid-cols-12"><section className="h-64 animate-pulse rounded-xl border border-border bg-surface lg:col-span-7" /><section className="h-64 animate-pulse rounded-xl border border-border bg-surface lg:col-span-5" /></div>
        </>}

        {status === 'unauthorized' && <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h2 className="workspace-section-title text-text-primary">Bạn cần đăng nhập để xem phân tích học tập.</h2><p className="workspace-page-description mx-auto mt-2 max-w-md">Đăng nhập ở trang luyện đề để xem các chuyên đề cần ôn, tiến độ và đề được gợi ý.</p><Link href="/dashboard" className="workspace-button-text mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Về trang luyện đề</Link></section>}

        {status === 'error' && <section className="rounded-xl border border-error-border bg-surface p-6 shadow-card"><h2 className="workspace-section-title text-error">Không tải được analytics</h2><p className="workspace-page-description mt-2">{errorMessage}</p></section>}

        {status === 'ready' && <>
          <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                ['Số lần làm', progressSummary.attemptCount],
                ['Điểm trung bình', progressSummary.averageScore.toFixed(1)],
                ['Điểm tốt nhất', progressSummary.bestScore.toFixed(1)],
                ['Tỷ lệ đúng gần đây', latestAccuracy === null ? '--' : `${latestAccuracy}%`],
              ].map(([label, value], index) => <div key={String(label)} className={`min-w-0 ${index < 3 ? 'border-b border-border pb-4 sm:border-b-0 sm:border-r sm:pr-4' : ''}`}><p className="workspace-metadata">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{value}</p></div>)}
            </div>
            {progressSummary.attemptCount > 0 && progressSummary.attemptCount < 3 ? <p className="workspace-metadata mt-4 border-t border-border pt-4">Hoàn thành thêm vài đề để xu hướng chính xác hơn.</p> : null}
          </section>

          {!hasAnalyticsData ? <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h2 className="workspace-section-title text-text-primary">Chưa đủ dữ liệu để phân tích chuyên đề</h2><p className="workspace-page-description mx-auto mt-2 max-w-xl">Hoàn thành thêm một đề để ManMath xác định điểm mạnh và phần cần ôn.</p><Link href="/dashboard" className="workspace-button-text mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Làm một đề ngay</Link></section> : <>
            <section className="grid overflow-hidden rounded-xl border border-border bg-surface shadow-card lg:grid-cols-12">
              <div className="p-5 lg:col-span-7 lg:border-r lg:border-border">
                <p className="workspace-eyebrow">Phần cần ưu tiên</p>
                <h2 className="workspace-section-title mt-1 text-text-primary">Ôn đúng phần trước lần làm tiếp theo.</h2>
                {priorityTopics.length === 0 ? <p className="workspace-page-description mt-4">Chưa có chuyên đề đủ dữ liệu để ưu tiên. Hãy hoàn thành thêm đề để xem gợi ý sát hơn.</p> : <div className="mt-5 divide-y divide-border border-y border-border">{priorityTopics.map((topic) => { const accuracy = clampAccuracy(getTopicPerformancePercentage(topic)); return <div key={topic.topicId ?? topic.topicName} className="py-3 first:pt-3 last:pb-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="workspace-item-title truncate text-text-primary">{topic.topicName}</p><p className="workspace-metadata mt-1">{topic.correct}/{topic.total} câu đúng</p></div><span className="workspace-badge-text shrink-0 text-text-secondary">{accuracy}%</span></div><p className="workspace-metadata mt-2">{topic.reason}</p>{topic.topicSlug ? <Link href={`/practice/topic/${topic.topicSlug}`} className="workspace-button-text mt-3 inline-flex h-9 items-center text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Luyện chuyên đề này</Link> : null}</div>; })}</div>}
              </div>
              <div className="p-5 lg:col-span-5">
                <p className="workspace-eyebrow">Bước tiếp theo</p>
                <h2 className="workspace-section-title mt-1 text-text-primary">Một đề phù hợp để tiếp tục.</h2>
                {nextExam ? <><div className="mt-5 border-y border-border py-4"><p className="workspace-item-title text-text-primary">{nextExam.title}</p><p className="workspace-metadata mt-2">{nextExam.durationMinutes} phút</p><p className="workspace-metadata mt-3">{nextExam.reason}</p></div><Link href={getExamTakingHref(nextExam.examId)} className="workspace-button-text mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Làm đề này</Link></> : <><p className="workspace-page-description mt-5">Chưa có đề gợi ý riêng. Bạn vẫn có thể chọn một đề trong kho để tiếp tục luyện tập.</p><Link href="/dashboard" className="workspace-button-text mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-surface px-4 text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem kho đề</Link></>}
                {recommendedExams.length > 1 ? <Link href="/dashboard" className="workspace-button-text mt-4 inline-flex text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem thêm gợi ý</Link> : null}
              </div>
            </section>

            <section className="border-t border-border pt-6">
              <div><p className="workspace-eyebrow">Năng lực theo chuyên đề</p><h2 className="workspace-section-title mt-1 text-text-primary">Kết quả có dữ liệu thực.</h2></div>
              {topicPerformance.length === 0 ? <p className="workspace-page-description mt-5">Chưa có dữ liệu theo chuyên đề. Hoàn thành thêm đề để xem kết quả tại đây.</p> : <div className="mt-5 divide-y divide-border border-y border-border">{topicPerformance.map((topic) => { const accuracy = clampAccuracy(getTopicPerformancePercentage(topic)); return <div key={topic.topicId ?? topic.topicName} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_96px_72px] sm:items-center"><div className="min-w-0"><p className="workspace-item-title truncate text-text-primary">{topic.topicName}</p><p className="workspace-metadata mt-1">{topic.correct}/{topic.total} câu đúng</p></div><div className="h-1.5 overflow-hidden rounded-full bg-background-alt"><div className="h-full rounded-full bg-primary" style={{ width: `${accuracy}%` }} /></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="workspace-badge-text text-text-secondary">{accuracy}%</span><span className="workspace-badge-text text-text-secondary">{getTopicState(topic)}</span></div></div>; })}</div>}
            </section>

            <div className="grid gap-8 border-t border-border pt-6 lg:grid-cols-12">
              <section className="lg:col-span-7"><p className="workspace-eyebrow">Xu hướng điểm số</p><h2 className="workspace-section-title mt-1 text-text-primary">Điểm qua các lượt làm gần đây.</h2><TrendChart attempts={progressByAttempt} averageScore={progressSummary.averageScore} /></section>
              <section className="lg:col-span-5"><div className="flex items-end justify-between gap-3"><div><p className="workspace-eyebrow">Lần làm gần nhất</p><h2 className="workspace-section-title mt-1 text-text-primary">Xem lại khi cần.</h2></div><Link href="/history" className="workspace-button-text shrink-0 text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem toàn bộ lịch sử</Link></div>{recentAttemptRows.length === 0 ? <p className="workspace-page-description mt-5">Chưa có lượt làm nào để hiển thị.</p> : <div className="mt-5 divide-y divide-border border-y border-border">{recentAttemptRows.map((attempt) => <Link key={attempt.attemptId} href={`/attempts/${attempt.attemptId}`} className="block py-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="workspace-item-title truncate text-text-primary">{attempt.examTitle}</p><p className="workspace-metadata mt-1">{formatSubmittedAt(attempt.submittedAt)}</p></div><div className="shrink-0 text-right"><p className="workspace-item-title tabular-nums text-text-primary">{attempt.score.toFixed(1)} điểm</p><p className="workspace-metadata mt-1">{attempt.correctCount}/{attempt.totalQuestions} đúng</p></div></div></Link>)}</div>}</section>
            </div>
          </>}
        </>}
      </div>
    </main>
  );
}
