import React from 'react';
import Link from 'next/link';
import type { SubtopicStat } from '../../lib/apiTypes';

export function SubtopicAnalyticsCard({
  weakSubtopics,
}: {
  weakSubtopics: SubtopicStat[];
}) {
  const clampAccuracy = (accuracy: number): number => {
    return Math.min(Math.max(accuracy, 0), 100);
  };

  return (
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
  );
}
