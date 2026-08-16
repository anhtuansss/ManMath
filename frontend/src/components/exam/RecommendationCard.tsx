'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchProtectedJson, isUnauthorizedError } from '../../lib/authApi';
import { getAuthToken, subscribeAuthTokenChange } from '../../lib/authStorage';
import { getExamTakingHref } from '../../lib/examRoutes';

type WeakTopicRecommendation = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
  accuracy: number;
  masteryPercentage: number | null;
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

type RecommendationsResponse = {
  weakTopics: WeakTopicRecommendation[];
  recommendedExams: RecommendedExam[];
};

type RecommendationStatus = 'loading' | 'empty' | 'ready' | 'error' | 'unauthenticated';

const clampAccuracy = (accuracy: number): number => Math.min(Math.max(accuracy, 0), 100);

export function RecommendationCard() {
  const [status, setStatus] = useState<RecommendationStatus>('loading');
  const [weakTopics, setWeakTopics] = useState<WeakTopicRecommendation[]>([]);
  const [recommendedExams, setRecommendedExams] = useState<RecommendedExam[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchRecommendations = async () => {
      if (!getAuthToken()) {
        if (isMounted) {
          setStatus('unauthenticated');
          setWeakTopics([]);
          setRecommendedExams([]);
        }
        return;
      }

      try {
        setStatus('loading');
        const data = await fetchProtectedJson<RecommendationsResponse>('/api/me/recommendations');
        if (!isMounted) return;

        const nextWeakTopics = Array.isArray(data.weakTopics) ? data.weakTopics : [];
        const nextRecommendedExams = Array.isArray(data.recommendedExams) ? data.recommendedExams : [];
        setWeakTopics(nextWeakTopics);
        setRecommendedExams(nextRecommendedExams);
        setStatus(
          nextWeakTopics.some((topic) => topic.total > 0) || nextRecommendedExams.length > 0
            ? 'ready'
            : 'empty',
        );
      } catch (error: unknown) {
        if (!isMounted) return;
        if (isUnauthorizedError(error)) {
          setStatus('unauthenticated');
          setWeakTopics([]);
          setRecommendedExams([]);
          return;
        }
        setStatus('error');
        setWeakTopics([]);
        setRecommendedExams([]);
      }
    };

    void fetchRecommendations();
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => {
      void fetchRecommendations();
    });

    return () => {
      isMounted = false;
      unsubscribeAuthTokenChange();
    };
  }, []);

  const visibleTopics = weakTopics.filter((topic) => topic.total > 0).slice(0, 2);
  const nextExam = recommendedExams[0] ?? null;

  if (status === 'unauthenticated') return null;

  return (
    <section className="border-l-2 border-primary bg-surface px-5 py-5" aria-labelledby="personal-guidance-title">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary" aria-hidden="true">
          <path d="m8 2.5 1.5 3.2 3.5.5-2.5 2.5.6 3.5L8 10.6l-3.1 1.6.6-3.5L3 6.2l3.5-.5L8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 id="personal-guidance-title" className="workspace-section-title text-text-primary">Tiến độ học</h2>
      </div>

      {status === 'loading' && (
        <div className="mt-5 space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-background-alt" />
          <div className="h-20 animate-pulse rounded-lg bg-background-alt" />
        </div>
      )}

      {status === 'empty' && (
        <div className="mt-4">
          <p className="workspace-page-description">Hoàn thành một đề để ManMath xác định chuyên đề cần ôn.</p>
          <Link href="/dashboard" className="workspace-button-text mt-4 inline-flex h-9 items-center text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Chọn một đề</Link>
        </div>
      )}

      {status === 'error' && <p className="workspace-page-description mt-4">Chưa tải được gợi ý. Kho đề vẫn sẵn sàng để bạn tiếp tục luyện tập.</p>}

      {status === 'ready' && (
        <div className="mt-4 space-y-5">
          {visibleTopics.length > 0 && (
            <div>
              <h3 className="workspace-sidebar-label">Chuyên đề cần ôn</h3>
              <div className="mt-3 divide-y divide-border border-y border-border">
                {visibleTopics.map((topic) => {
                  const accuracy = clampAccuracy(topic.masteryPercentage ?? topic.accuracy);
                  return (
                    <div key={topic.topicId ?? topic.topicName} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="workspace-item-title min-w-0 truncate text-text-primary">{topic.topicName}</p>
                        <span className="workspace-badge-text shrink-0 text-text-secondary">{accuracy}%</span>
                      </div>
                      <p className="workspace-metadata mt-1">{topic.correct}/{topic.total} câu đúng</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nextExam && (
            <div>
              <h3 className="workspace-sidebar-label">Đề nên làm tiếp</h3>
              <Link href={getExamTakingHref(nextExam.examId)} className="mt-3 block rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary-light/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <p className="workspace-item-title text-text-primary">{nextExam.title}</p>
                <p className="workspace-metadata mt-2">{nextExam.durationMinutes} phút{nextExam.matchedWeakQuestionCount > 0 ? ` · ${nextExam.matchedWeakQuestionCount} câu thuộc phần cần ôn` : ''}</p>
              </Link>
            </div>
          )}

          <Link href="/analytics" className="workspace-button-text inline-flex text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem phân tích đầy đủ</Link>
        </div>
      )}
    </section>
  );
}
