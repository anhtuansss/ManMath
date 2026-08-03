import React from 'react';
import { MathText } from './MathText';
import { OptionImage } from './OptionImage';
import { QuestionImage } from './QuestionImage';
import type { QuestionDto } from './types';

export type ReviewStatus = 'correct' | 'incorrect' | 'unanswered';

export const getReviewStatus = (
  question: QuestionDto,
  selectedOptionIndex: number | undefined,
): ReviewStatus => {
  if (selectedOptionIndex === undefined) return 'unanswered';

  const correctOptionIndex = question.options.indexOf(question.correctAnswer);
  return selectedOptionIndex === correctOptionIndex ? 'correct' : 'incorrect';
};

const reviewBadgeClass: Record<ReviewStatus, string> = {
  correct: 'border-success-border bg-success-light text-success',
  incorrect: 'border-error-border bg-error-light text-error',
  unanswered: 'border-warning-border bg-warning-light text-warning',
};

const reviewAccentClass: Record<ReviewStatus, string> = {
  correct: 'border-l-4 border-l-success',
  incorrect: 'border-l-4 border-l-error',
  unanswered: 'border-l-4 border-l-warning',
};

const reviewHeaderClass: Record<ReviewStatus, string> = {
  correct: 'bg-success/5',
  incorrect: 'bg-error/5',
  unanswered: 'bg-warning/5',
};

const reviewAnswerClass: Record<ReviewStatus, string> = {
  correct: 'border-success-border bg-success-light/50',
  incorrect: 'border-error-border bg-error-light/50',
  unanswered: 'border-warning-border bg-warning-light/50',
};

const reviewLabel: Record<ReviewStatus, string> = {
  correct: 'Đúng',
  incorrect: 'Sai',
  unanswered: 'Chưa làm',
};

export type ReviewQuestionCardProps = {
  question: QuestionDto;
  index: number;
  selectedOptionIndex: number | undefined;
};

export function ReviewQuestionCard({
  question,
  index,
  selectedOptionIndex,
}: ReviewQuestionCardProps) {
  const selectedAnswer =
    selectedOptionIndex !== undefined
      ? question.options[selectedOptionIndex] ?? 'Đáp án không hợp lệ'
      : 'Chưa chọn đáp án';

  const selectedOptionImageUrl =
    selectedOptionIndex !== undefined
      ? question.optionImageUrls?.[selectedOptionIndex] ?? null
      : null;

  const correctOptionIndex = question.options.indexOf(question.correctAnswer);

  const correctOptionImageUrl =
    correctOptionIndex >= 0
      ? question.optionImageUrls?.[correctOptionIndex] ?? null
      : null;

  const status = getReviewStatus(question, selectedOptionIndex);

  return (
    <article
      id={`question-${question.id}`}
      className={`overflow-hidden rounded-xl border border-border bg-surface shadow-card ${reviewAccentClass[status]}`}
    >
      <div className={`flex items-center justify-between border-b border-border px-4 py-2.5 ${reviewHeaderClass[status]}`}>
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold text-text-primary shadow-sm border border-border">
            {index + 1}
          </span>
          <span className="text-xs font-medium text-text-secondary">
            ID: {question.id}
          </span>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${reviewBadgeClass[status]}`}
        >
          {reviewLabel[status]}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <MathText
          as="p"
          text={question.question}
          className="text-sm sm:text-base leading-7 text-text-primary"
        />

        <QuestionImage
          imageUrl={question.imageUrl}
          alt={`Hình minh họa câu ${index + 1}`}
          className="mt-3 sm:mt-4"
        />

        <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
          <div className={`rounded-lg border p-3 sm:p-4 ${reviewAnswerClass[status]}`}>
            <p className="text-xs font-semibold text-text-secondary">Đáp án của bạn</p>
            <MathText
              as="p"
              text={selectedAnswer}
              className="mt-1.5 sm:mt-2 text-sm font-medium leading-6 text-text-primary"
            />
            <OptionImage
              imageUrl={selectedOptionImageUrl}
              alt={`Hình minh họa đáp án bạn chọn ở câu ${index + 1}`}
              className="mt-2 sm:mt-3"
            />
          </div>

          <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
            <p className="text-xs font-semibold text-text-secondary">Đáp án đúng</p>
            <MathText
              as="p"
              text={question.correctAnswer}
              className="mt-1.5 sm:mt-2 text-sm font-medium leading-6 text-text-primary"
            />
            <OptionImage
              imageUrl={correctOptionImageUrl}
              alt={`Hình minh họa đáp án đúng ở câu ${index + 1}`}
              className="mt-2 sm:mt-3"
            />
          </div>
        </div>

        {question.explanation ? (
          <div className="mt-4 sm:mt-5 rounded-lg border border-border bg-slate-50/80 p-3 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5 sm:mb-2">
              Lời giải chi tiết
            </p>
            <MathText
              as="div"
              text={question.explanation}
              className="text-sm leading-6 text-text-primary"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
