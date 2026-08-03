'use client';

import type { QuestionDto } from './types';

type ReviewStatus = 'correct' | 'incorrect' | 'unanswered';
const getReviewStatus = (question: QuestionDto, selectedOptionIndex: number | undefined): ReviewStatus => selectedOptionIndex === undefined ? 'unanswered' : selectedOptionIndex === question.options.indexOf(question.correctAnswer) ? 'correct' : 'incorrect';
const navButtonClass: Record<ReviewStatus, string> = { correct: 'border-success-border bg-success-light text-success hover:bg-success hover:text-white', incorrect: 'border-error-border bg-error-light text-error hover:bg-error hover:text-white', unanswered: 'border-warning-border bg-warning-light text-warning hover:bg-warning hover:text-white' };

type Props = { questions: QuestionDto[]; answers: Record<string, number> };

export function ResultQuestionNavigator({ questions, answers }: Props) {
  const scrollToQuestion = (id: number) => document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return <nav className="border border-border bg-surface p-4 lg:p-5" aria-label="Chuyển đến câu hỏi review"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-text-primary">Chuyển đến câu hỏi</h3><span className="text-xs font-medium tabular-nums text-text-secondary">{questions.length} câu</span></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">{questions.map((question, index) => { const status = getReviewStatus(question, answers[question.id]); return <button key={question.id} type="button" onClick={() => scrollToQuestion(question.id)} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${navButtonClass[status]}`} aria-label={`Câu ${index + 1} - ${status}`}>{index + 1}</button>; })}</div><div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary"><span>Đúng</span><span>Sai</span><span>Chưa làm</span></div></nav>;
}
