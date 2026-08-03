import type { Answers, Question } from './types';

type ExamSidebarProps = {
  questions?: Question[];
  answers: Answers;
  isTimeUp: boolean;
  onQuestionClick: (questionId: number) => void;
  currentQuestionId: number | null;
};

export function ExamSidebar({
  questions,
  answers,
  isTimeUp,
  onQuestionClick,
  currentQuestionId,
}: ExamSidebarProps) {
  const totalQuestions = questions?.length ?? 0;
  const answeredCount =
    questions?.filter((question) => answers[question.id] !== undefined).length ?? 0;
  const progressPercentage =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <div>
          <h3 className="font-[family-name:var(--font-outfit)] text-sm font-semibold text-text-primary">
            Câu hỏi
          </h3>
          <p className="mt-1 text-xs font-medium text-text-secondary">
            Điều hướng nhanh trong đề
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-text-secondary">Đã làm</span>
            <span className="font-semibold text-text-primary">
              {answeredCount}/{totalQuestions}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background-alt">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="grid grid-cols-5 gap-2">
            {questions?.map((question, index) => {
              const isAnswered = answers[question.id] !== undefined;
              const isCurrent = question.id === currentQuestionId;

              return (
                <button
                  aria-current={isCurrent ? 'true' : undefined}
                  key={question.id}
                  type="button"
                  onClick={() => onQuestionClick(question.id)}
                  className={`
                    flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border text-xs font-semibold transition-all duration-200 active:scale-[0.9]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${isCurrent
                      ? 'border-primary bg-primary text-white'
                      : isAnswered
                        ? 'border-success-border bg-success-light text-success hover:border-success'
                        : 'border-border bg-surface text-text-secondary hover:border-primary-hover hover:bg-primary-light/40 hover:text-primary'
                    }
                  `}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-2 border-t border-border pt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="font-medium text-text-secondary">Câu hiện tại</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border border-success-border bg-success-light" />
            <span className="font-medium text-text-secondary">Đã trả lời</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border border-border bg-surface" />
            <span className="font-medium text-text-secondary">Chưa trả lời</span>
          </div>
        </div>

        {isTimeUp && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-error-border bg-error-light px-3 py-2 text-sm font-semibold text-error">
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
                d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm0 7a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM8 4.5a.75.75 0 0 1 .743.648L8.75 5.25v3.5a.75.75 0 0 1-1.493.102L7.25 8.75v-3.5A.75.75 0 0 1 8 4.5Z"
                fill="currentColor"
              />
            </svg>
            Đã hết giờ
          </div>
        )}
      </div>
    </aside>
  );
}
