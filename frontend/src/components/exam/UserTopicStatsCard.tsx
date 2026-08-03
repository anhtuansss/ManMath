'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchProtectedJson, isUnauthorizedError } from '../../lib/authApi';
import { subscribeAuthTokenChange } from '../../lib/authStorage';
import type { TopicStatDto } from './types';

type TopicStatsResponse = { topicStats: TopicStatDto[] };
type TopicStatsStatus = 'loading' | 'unauthenticated' | 'empty' | 'ready' | 'error';
const MAX_VISIBLE_TOPICS = 3;
const clampAccuracy = (accuracy: number): number => Math.min(Math.max(accuracy, 0), 100);

export function UserTopicStatsCard() {
  const [status, setStatus] = useState<TopicStatsStatus>('loading');
  const [topicStats, setTopicStats] = useState<TopicStatDto[]>([]);
  useEffect(() => {
    let isMounted = true;
    const fetchTopicStats = async () => {
      try {
        setStatus('loading');
        const data = await fetchProtectedJson<TopicStatsResponse>('/api/me/topic-stats');
        if (!isMounted) return;
        const nextTopicStats = Array.isArray(data.topicStats) ? data.topicStats : [];
        setTopicStats(nextTopicStats);
        setStatus(nextTopicStats.some((topic) => topic.total > 0) ? 'ready' : 'empty');
      } catch (error: unknown) {
        if (!isMounted) return;
        if (isUnauthorizedError(error)) {
          setStatus('unauthenticated');
          setTopicStats([]);
          return;
        }
        setStatus('error');
        setTopicStats([]);
      }
    };
    void fetchTopicStats();
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => { void fetchTopicStats(); });
    return () => { isMounted = false; unsubscribeAuthTokenChange(); };
  }, []);
  const visibleTopicStats = useMemo(() => [...topicStats].filter((topic) => topic.total > 0).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total).slice(0, MAX_VISIBLE_TOPICS), [topicStats]);

  return <section className="rounded-xl border border-border bg-surface p-6 shadow-card"><p className="workspace-eyebrow">Learning focus</p><h2 className="workspace-section-title mt-1 text-text-primary">Chuyên đề cần ôn</h2>{status === 'loading' && <div className="mt-5 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded bg-background-alt" />)}</div>}{status === 'ready' && <div className="mt-5 divide-y divide-border border-y border-border">{visibleTopicStats.map((topic) => { const accuracy = clampAccuracy(topic.accuracy); return <div key={topic.topicId ?? topic.topicName} className="py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="workspace-item-title truncate text-text-primary">{topic.topicName}</p><p className="workspace-metadata mt-1">{topic.correct}/{topic.total} câu đúng</p></div><span className="workspace-badge-text text-text-secondary">{accuracy}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background-alt"><div className="h-full rounded-full bg-primary" style={{ width: `${accuracy}%` }} /></div></div>; })}</div>}{status === 'empty' && <div className="mt-5 border-y border-border py-4"><p className="workspace-item-title text-text-primary">Chưa đủ dữ liệu để xác định chuyên đề cần ôn.</p><p className="workspace-page-description mt-1">Hoàn thành thêm một đề để ManMath phân tích chính xác hơn.</p><Link href="/dashboard" className="workspace-button-text mt-4 inline-flex text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Làm một đề ngay</Link></div>}{status === 'error' && <p className="workspace-page-description mt-5">Chưa tải được phân tích chuyên đề. Hãy thử lại sau.</p>}{status === 'ready' || status === 'empty' ? <Link href="/analytics" className="workspace-button-text mt-5 inline-flex text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem phân tích chi tiết</Link> : null}</section>;
}
