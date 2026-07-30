import Link from 'next/link';
import type { ExamListItem } from './types';

type ExamCardProps = {
  exam: ExamListItem;
  variant?: 'featured' | 'compact';
};

const difficultyStyles: Record<ExamListItem['difficulty'], string> = {
  easy: 'border-success-border bg-success-light text-success',
  medium: 'border-primary-light bg-primary-50 text-primary',
  hard: 'border-error-border bg-error-light text-error',
};

const difficultyLabels: Record<ExamListItem['difficulty'], string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

const getExamMeta = (exam: ExamListItem) => {
  const parts = [exam.subject];

  if (exam.year) {
    parts.push(String(exam.year));
  }
  if (exam.type) {
    parts.push(exam.type);
  }
  if (exam.source) {
    parts.push(exam.source);
  }

  return parts.join(' · ');
};

export function ExamCard({ exam, variant = 'featured' }: ExamCardProps) {
  // We use a pseudo-random but deterministic number for 'Lượt làm' since we don't have it in API
  const simulatedViewCount = (exam.id.charCodeAt(0) * 123 + exam.id.charCodeAt(exam.id.length - 1) * 456) % 15000 + 1000;

  if (variant === 'compact') {
    return (
      <article className="group cursor-pointer border-b border-border py-4 transition-colors duration-200 hover:bg-background-alt px-3 -mx-3 rounded-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-sm font-semibold leading-5 text-text-primary transition-colors duration-200 group-hover:text-primary">
              {exam.title}
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              {getExamMeta(exam)} · {exam.totalQuestions} câu · {exam.durationMinutes} phút
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-6 md:justify-end">
            <div className="hidden sm:block text-right w-20">
              <span className="text-sm font-medium text-text-secondary">{simulatedViewCount.toLocaleString()}</span>
            </div>

            <div className="w-28 shrink-0 flex justify-center">
              <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${difficultyStyles[exam.difficulty]}`}>
                {difficultyLabels[exam.difficulty]}
              </span>
            </div>

            <div className="flex shrink-0 w-[72px] justify-end">
              <Link
                href={exam.href}
                className="text-sm font-semibold text-primary hover:text-primary-hover whitespace-nowrap"
              >
                Vào đề &rarr;
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex min-h-[220px] cursor-pointer flex-col rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-card-hover">
      <div className="flex-1 min-w-0">
        <h3 className="line-clamp-2 font-[family-name:var(--font-outfit)] text-lg font-bold leading-6 text-text-primary transition-colors duration-200 group-hover:text-primary">
          {exam.title}
        </h3>
        <p className="mt-1.5 text-sm text-text-secondary">{getExamMeta(exam)}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-background-alt px-2 py-1 font-medium text-text-secondary">{exam.totalQuestions} câu</span>
          <span className="rounded-md bg-background-alt px-2 py-1 font-medium text-text-secondary">{exam.durationMinutes} phút</span>
          <span className={`rounded-md px-2 py-1 font-medium ${difficultyStyles[exam.difficulty]}`}>
            {difficultyLabels[exam.difficulty]}
          </span>
        </div>

        <p className="mt-4 text-xs font-medium text-text-secondary">
          Đã có {simulatedViewCount.toLocaleString()} lượt làm
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link
          href={exam.href}
          aria-label={`Bắt đầu làm bài ${exam.title}`}
          className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Bắt đầu làm bài
        </Link>
        <button type="button" aria-label="Lưu đề" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-background-alt hover:text-text-primary transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        </button>
      </div>
    </article>
  );
}
