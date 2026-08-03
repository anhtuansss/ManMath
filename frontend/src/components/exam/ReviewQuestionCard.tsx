import { MathText } from './MathText';
import { OptionImage } from './OptionImage';
import { QuestionImage } from './QuestionImage';
import type { QuestionDto } from './types';

export type ReviewStatus = 'correct' | 'incorrect' | 'unanswered';

export const getReviewStatus = (question: QuestionDto, selectedOptionIndex: number | undefined): ReviewStatus => {
  if (selectedOptionIndex === undefined) return 'unanswered';
  return selectedOptionIndex === question.options.indexOf(question.correctAnswer) ? 'correct' : 'incorrect';
};

const reviewBadgeClass: Record<ReviewStatus, string> = {
  correct: 'border-success-border bg-success-light text-success',
  incorrect: 'border-error-border bg-error-light text-error',
  unanswered: 'border-warning-border bg-warning-light text-warning',
};

const reviewAccentClass: Record<ReviewStatus, string> = {
  correct: 'border-l-success',
  incorrect: 'border-l-error',
  unanswered: 'border-l-warning',
};

const reviewLabel: Record<ReviewStatus, string> = { correct: 'Đúng', incorrect: 'Sai', unanswered: 'Chưa làm' };

type ReviewQuestionCardProps = { question: QuestionDto; index: number; selectedOptionIndex: number | undefined };

export function ReviewQuestionCard({ question, index, selectedOptionIndex }: ReviewQuestionCardProps) {
  const selectedAnswer = selectedOptionIndex !== undefined ? question.options[selectedOptionIndex] ?? 'Đáp án không hợp lệ' : 'Chưa chọn đáp án';
  const selectedOptionImageUrl = selectedOptionIndex !== undefined ? question.optionImageUrls?.[selectedOptionIndex] ?? null : null;
  const correctOptionIndex = question.options.indexOf(question.correctAnswer);
  const correctOptionImageUrl = correctOptionIndex >= 0 ? question.optionImageUrls?.[correctOptionIndex] ?? null : null;
  const status = getReviewStatus(question, selectedOptionIndex);

  return <article id={`question-${question.id}`} className={`scroll-mt-24 border-l-4 border-b border-r border-t border-border bg-surface ${reviewAccentClass[status]}`}>
    <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="flex min-w-0 items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-text-primary">{index + 1}</span><span className="truncate text-xs font-medium text-text-secondary">{question.subtopic?.name ?? `Câu ${index + 1}`}</span></div><span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${reviewBadgeClass[status]}`}>{reviewLabel[status]}</span></header>
    <div className="px-4 py-4 sm:px-5"><MathText as="p" text={question.question} className="text-sm leading-7 text-text-primary sm:text-base" /><QuestionImage imageUrl={question.imageUrl} alt={`Hình minh họa câu ${index + 1}`} className="mt-3" />
      <dl className="mt-4 divide-y divide-border border-y border-border text-sm"><div className="grid gap-1 py-3 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-4"><dt className="text-xs font-medium text-text-secondary">Đáp án của bạn</dt><dd><MathText as="div" text={selectedAnswer} className="font-medium leading-6 text-text-primary" /><OptionImage imageUrl={selectedOptionImageUrl} alt={`Hình minh họa đáp án bạn chọn ở câu ${index + 1}`} className="mt-2" /></dd></div><div className="grid gap-1 py-3 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-4"><dt className="text-xs font-medium text-text-secondary">Đáp án đúng</dt><dd><MathText as="div" text={question.correctAnswer} className="font-medium leading-6 text-text-primary" /><OptionImage imageUrl={correctOptionImageUrl} alt={`Hình minh họa đáp án đúng ở câu ${index + 1}`} className="mt-2" /></dd></div></dl>
      {question.explanation ? <div className="mt-4 border-t border-border pt-4"><p className="text-xs font-semibold text-text-secondary">Lời giải</p><MathText as="div" text={question.explanation} className="mt-2 text-sm leading-6 text-text-primary" /></div> : null}
    </div>
  </article>;
}
