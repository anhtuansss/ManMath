'use client';

import { QuestionDto } from './types';

type ReviewStatus = 'correct' | 'incorrect' | 'unanswered';

const getReviewStatus = (
  question: QuestionDto,
  selectedOptionIndex: number | undefined,
): ReviewStatus => {
  if (selectedOptionIndex === undefined) return 'unanswered';
  const correctOptionIndex = question.options.indexOf(question.correctAnswer);
  return selectedOptionIndex === correctOptionIndex ? 'correct' : 'incorrect';
};

const navButtonClass: Record<ReviewStatus, string> = {
  correct: 'bg-success-light text-success border border-success-border hover:bg-success hover:text-white',
  incorrect: 'bg-error-light text-error border border-error-border hover:bg-error hover:text-white',
  unanswered: 'bg-warning-light text-warning border border-warning-border hover:bg-warning hover:text-white',
};

type Props = {
  questions: QuestionDto[];
  answers: Record<string, number>;
};

export function ResultQuestionNavigator({ questions, answers }: Props) {
  const scrollToQuestion = (id: number) => {
    document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h3 className="font-[family-name:var(--font-outfit)] text-base font-semibold text-text-primary">
        Chuyển đến câu hỏi
      </h3>
      
      <div className="mt-4 flex flex-wrap gap-2 lg:grid lg:grid-cols-5">
        {questions.map((q, index) => {
          const status = getReviewStatus(q, answers[q.id]);
          return (
            <button
              key={q.id}
              onClick={() => scrollToQuestion(q.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${navButtonClass[status]}`}
              aria-label={`Câu ${index + 1} - ${status}`}
            >
              {index + 1}
            </button>
          );
        })}
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
    </div>
  );
}
