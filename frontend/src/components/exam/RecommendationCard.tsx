'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchProtectedJson, isUnauthorizedError } from '../../lib/authApi';
import { subscribeAuthTokenChange } from '../../lib/authStorage';

type WeakTopicRecommendation = {
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

type RecommendationsResponse = {
  weakTopics: WeakTopicRecommendation[];
  recommendedExams: RecommendedExam[];
};

type RecommendationStatus =
  | 'loading'
  | 'unauthenticated'
  | 'empty'
  | 'ready'
  | 'error';

const MAX_VISIBLE_TOPICS = 2;
const MAX_VISIBLE_EXAMS = 2;

const clampAccuracy = (accuracy: number): number => {
  return Math.min(Math.max(accuracy, 0), 100);
};

export function RecommendationCard() {
  const [status, setStatus] = useState<RecommendationStatus>('loading');
  const [weakTopics, setWeakTopics] = useState<WeakTopicRecommendation[]>([]);
  const [recommendedExams, setRecommendedExams] = useState<RecommendedExam[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchRecommendations = async () => {
      try {
        setStatus('loading');

        const data = await fetchProtectedJson<RecommendationsResponse>(
          '/api/me/recommendations',
        );

        if (!isMounted) {
          return;
        }

        const nextWeakTopics = Array.isArray(data.weakTopics)
          ? data.weakTopics
          : [];
        const nextRecommendedExams = Array.isArray(data.recommendedExams)
          ? data.recommendedExams
          : [];

        setWeakTopics(nextWeakTopics);
        setRecommendedExams(nextRecommendedExams);
        setStatus(
          nextWeakTopics.length > 0 || nextRecommendedExams.length > 0
            ? 'ready'
            : 'empty',
        );
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

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

  const visibleWeakTopics = weakTopics.slice(0, MAX_VISIBLE_TOPICS);
  const visibleRecommendedExams = recommendedExams.slice(0, MAX_VISIBLE_EXAMS);

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-primary"
          aria-hidden="true"
        >
          <path
            d="M8 2.5 9.7 6l3.8.6-2.8 2.7.7 3.7L8 11.2 4.6 13l.7-3.7L2.5 6.6 6.3 6 8 2.5Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="font-[family-name:var(--font-outfit)] text-base font-semibold text-text-primary">
          Gợi ý luyện tập
        </h2>
      </div>

      {status === 'loading' && (
        <div className="mt-4 space-y-3">
          {[0, 1].map((item) => (
            <div key={item} className="animate-pulse rounded-lg bg-background p-3">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="mt-2 h-2 rounded-full bg-slate-100" />
              <div className="mt-3 h-3 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {status === 'unauthenticated' && (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-text-secondary">
            Dang nhap de nhan goi y ca nhan hoa theo ket qua luyen tap cua ban.
          </p>
          <Link
            href="/analytics"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
          >
            Xem phan tich day du
          </Link>
        </div>
      )}

      {status === 'empty' && (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-text-secondary">
            Chua co du lieu goi y. Hay lam mot de de he thong bat dau phan tich.
          </p>
          <Link
            href="/analytics"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
          >
            Xem phan tich day du
          </Link>
        </div>
      )}

      {status === 'error' && (
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Chua tai duoc goi y luyen tap. Hay thu lai sau.
        </p>
      )}

      {status === 'ready' && (
        <div className="mt-4 space-y-4">
          {visibleWeakTopics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Chuyên đề cần ôn
              </h3>
              <div className="mt-3 space-y-3">
                {visibleWeakTopics.map((topic) => {
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
                            {topic.correct}/{topic.total} cau dung
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
                          {accuracy}%
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-alt">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>

                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-text-secondary">
                        {topic.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {visibleRecommendedExams.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Đề nên làm tiếp
              </h3>
              <div className="mt-3 space-y-3">
                {visibleRecommendedExams.map((exam) => (
                  <Link
                    key={exam.examId}
                    href={`/exam/${exam.examId}`}
                    className="block rounded-lg border border-border bg-background p-3 transition-colors duration-200 hover:border-primary/30 hover:bg-primary-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-5 text-text-primary">
                          {exam.title}
                        </p>
                        <p className="mt-2 text-xs text-text-secondary">
                          {exam.durationMinutes} phut
                          {exam.matchedWeakQuestionCount > 0
                            ? ` · ${exam.matchedWeakQuestionCount} cau bam topic yeu`
                            : ''}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
                        Xem de
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-text-secondary">
                      {exam.reason}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/analytics"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
            >
              Xem phân tích đầy đủ
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
            >
              Xem hồ sơ
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
