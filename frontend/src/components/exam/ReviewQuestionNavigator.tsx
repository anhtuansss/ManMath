'use client';

export type ReviewItemStatus = 'correct' | 'incorrect' | 'unanswered';

export type ReviewNavigatorItem = {
  id: number;
  label: string;
  status: ReviewItemStatus;
};

type Props = {
  items: ReviewNavigatorItem[];
};

const navButtonClass: Record<ReviewItemStatus, string> = {
  correct: 'bg-success-light text-success border border-success-border hover:bg-success hover:text-white',
  incorrect: 'bg-error-light text-error border border-error-border hover:bg-error hover:text-white',
  unanswered: 'bg-warning-light text-warning border border-warning-border hover:bg-warning hover:text-white',
};

export function ReviewQuestionNavigator({ items }: Props) {
  const scrollToQuestion = (id: number) => {
    document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h3 className="font-[family-name:var(--font-outfit)] text-base font-semibold text-text-primary">
        Chuyển đến câu hỏi
      </h3>
      
      <div className="mt-4 flex flex-wrap gap-2 lg:grid lg:grid-cols-5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollToQuestion(item.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${navButtonClass[item.status]}`}
            aria-label={`${item.label} - ${item.status}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-text-secondary">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success border border-success-border"></div>
          Đúng
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-error border border-error-border"></div>
          Sai
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-warning border border-warning-border"></div>
          Chưa làm
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-background-alt"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lên đầu
      </button>
    </div>
  );
}
