import Link from 'next/link';
import { Logo } from './Logo';
import { TimerDisplay } from './TimerDisplay';

type ExamHeaderProps = {
  examTitle?: string;
  questionCount: number;
  remainingSeconds: number;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitLabel?: string;
};

export function ExamHeader({
  examTitle,
  remainingSeconds,
  onSubmit,
  questionCount,
  submitDisabled = false,
  submitLabel = 'Nộp bài',
}: ExamHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm shadow-header">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Về trang chủ"
            className="group flex shrink-0 cursor-pointer items-center gap-2 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Logo className="h-9 w-9 transition-transform group-hover:scale-105" />
            <span className="hidden text-sm font-semibold text-text-primary transition-colors group-hover:text-primary sm:inline">
              ManMath
            </span>
          </Link>

          <div className="min-w-0 border-l border-border pl-4">
            <p className="text-xs font-medium text-text-secondary">
              {questionCount} câu hỏi
            </p>
            <h1 className="mt-0.5 truncate font-[family-name:var(--font-outfit)] text-sm font-semibold text-text-primary sm:text-base">
              {examTitle ?? 'Đề luyện thi'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <TimerDisplay remainingSeconds={remainingSeconds} />
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:bg-primary-hover disabled:cursor-not-allowed disabled:bg-background-alt disabled:text-text-muted"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M13.354 2.646a.5.5 0 0 1 .058.638l-.058.07L6.707 10l-3-3a.5.5 0 0 1 .638-.765l.07.058L7 8.586l6.293-6.293a.5.5 0 0 1 .708 0l-.647.353Z"
                fill="currentColor"
              />
              <path
                d="M14.5 8a.5.5 0 0 1 .492.41L15 8.5V12a3 3 0 0 1-2.824 2.995L12 15H4a3 3 0 0 1-2.995-2.824L1 12V4a3 3 0 0 1 2.824-2.995L4 1h5.5a.5.5 0 0 1 .09.992L9.5 2H4a2 2 0 0 0-1.995 1.85L2 4v8a2 2 0 0 0 1.85 1.995L4 14h8a2 2 0 0 0 1.995-1.85L14 12V8.5a.5.5 0 0 1 .5-.5Z"
                fill="currentColor"
              />
            </svg>
            {submitLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
