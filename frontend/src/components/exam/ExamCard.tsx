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
  if (variant === 'compact') {
    return (
      <article className="group cursor-pointer py-4 transition-colors duration-200 hover:bg-background-alt">
        <div className="flex flex-col gap-3 rounded-lg px-3 py-2 transition-colors md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="workspace-item-title text-text-primary transition-colors duration-200 group-hover:text-primary">
              {exam.title}
            </h3>
            <p className="workspace-metadata mt-1.5">
              {getExamMeta(exam)} <span aria-hidden="true">·</span> {exam.totalQuestions} câu <span aria-hidden="true">·</span> {exam.durationMinutes} phút
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 md:justify-end">
            <div className="w-24 shrink-0 text-left md:text-center">
              <span className={`workspace-badge-text inline-flex whitespace-nowrap rounded-md border px-2.5 py-1 ${difficultyStyles[exam.difficulty]}`}>
                {difficultyLabels[exam.difficulty]}
              </span>
            </div>

            <div className="flex w-[88px] shrink-0 justify-end">
              <Link
                href={exam.href}
                className="workspace-button-text inline-flex h-9 items-center justify-center rounded-md bg-primary-light px-3 text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Vào đề
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex min-h-[176px] cursor-pointer flex-col rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-card-hover">
      <div className="flex-1 min-w-0">
        <h3 className="workspace-item-title line-clamp-2 text-text-primary transition-colors duration-200 group-hover:text-primary">
          {exam.title}
        </h3>
        <p className="workspace-metadata mt-1.5">{getExamMeta(exam)}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="workspace-badge-text rounded-md bg-background-alt px-2 py-1 text-text-secondary">{exam.totalQuestions} câu</span>
          <span className="workspace-badge-text rounded-md bg-background-alt px-2 py-1 text-text-secondary">{exam.durationMinutes} phút</span>
          <span className={`workspace-badge-text rounded-md px-2 py-1 ${difficultyStyles[exam.difficulty]}`}>
            {difficultyLabels[exam.difficulty]}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <Link
          href={exam.href}
          aria-label={`Bắt đầu làm bài ${exam.title}`}
          className="workspace-button-text inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.985]"
        >
          Bắt đầu làm bài
        </Link>
      </div>
    </article>
  );
}
