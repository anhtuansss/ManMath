import { MathText } from '../exam/MathText';
import { QuestionImage } from '../exam/QuestionImage';
import type { V2AttemptReviewQuestionDto } from './types';

type AttemptReviewSectionProps = {
  readonly question: V2AttemptReviewQuestionDto;
  readonly questionNumber: number;
};

const answerLabel = (value: boolean | undefined): string =>
  value === undefined ? 'Chưa trả lời' : value ? 'Đúng' : 'Sai';

const statusCopy = (question: V2AttemptReviewQuestionDto): string => {
  if (question.studentResponse === null) return 'CHƯA TRẢ LỜI';
  return question.isFullyCorrect ? 'TRẢ LỜI ĐÚNG' : 'TRẢ LỜI SAI';
};

const statusClassName = (question: V2AttemptReviewQuestionDto): string => {
  if (question.studentResponse === null) return 'border-warning-border bg-warning-light text-warning';
  return question.isFullyCorrect
    ? 'border-success-border bg-success-light text-success'
    : 'border-error-border bg-error-light text-error';
};

function ChoiceMark({ correct, selected }: { readonly correct: boolean; readonly selected: boolean }) {
  if (correct && selected) return <span aria-label="Bạn chọn đúng" className="text-sm font-bold">✓</span>;
  if (correct) return <span aria-label="Đáp án đúng" className="text-sm font-bold">✓</span>;
  if (selected) return <span aria-label="Bạn chọn sai" className="text-sm font-bold">×</span>;
  return null;
}

function TrueFalseReviewTable({ question }: { readonly question: Extract<V2AttemptReviewQuestionDto, { type: 'true_false_group' }> }) {
  const responseValues = question.studentResponse?.type === 'true_false_group'
    ? question.studentResponse.values
    : {};

  return <div className="mt-6 overflow-hidden rounded-xl border border-border"><div className="overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-left"><thead className="bg-background-alt text-xs font-semibold uppercase tracking-wide text-text-secondary"><tr><th scope="col" className="px-4 py-3">Phát biểu</th><th scope="col" className="w-24 border-l border-border px-3 py-3 text-center">Đúng</th><th scope="col" className="w-24 border-l border-border px-3 py-3 text-center">Sai</th></tr></thead><tbody className="divide-y divide-border">{question.statements.map((statement, index) => {
    const selected = responseValues[statement.id];
    const correct = question.correctAnswer.values[statement.id];
    const cellClass = (value: boolean): string => {
      const isSelected = selected === value;
      const isCorrect = correct === value;
      if (isSelected && isCorrect) return 'bg-success-light text-success';
      if (isSelected) return 'bg-error-light text-error';
      if (isCorrect) return 'bg-success-light/50 text-success';
      return 'bg-surface text-text-muted';
    };
    return <tr key={statement.id} className="bg-surface align-top"><td className="px-4 py-4"><div className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">{String.fromCharCode(97 + index)}</span><MathText as="div" text={statement.content} className="min-w-0 text-sm leading-6 text-text-primary" /></div></td>{[true, false].map((value) => { const isSelected = selected === value; const isCorrect = correct === value; return <td key={String(value)} className={`border-l border-border px-3 py-4 text-center ${cellClass(value)}`}><div className="flex min-h-6 items-center justify-center"><ChoiceMark correct={isCorrect} selected={isSelected} /></div><span className="sr-only">{isSelected ? `Bạn chọn ${answerLabel(value)}. ` : ''}{isCorrect ? 'Đáp án đúng.' : ''}</span></td>; })}</tr>;
  })}</tbody></table></div><div className="border-t border-border bg-background px-4 py-3 text-xs leading-5 text-text-secondary"><span className="font-semibold text-success">✓</span> Đáp án đúng &nbsp;·&nbsp; <span className="font-semibold text-error">×</span> Lựa chọn chưa đúng</div></div>;
}

export function AttemptReviewSection({ question, questionNumber }: AttemptReviewSectionProps) {
  return <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{questionNumber}</span><div><p className="text-sm font-semibold text-text-primary">Câu {questionNumber}</p><p className="mt-0.5 text-xs text-text-secondary">Phần {question.section}</p></div></div><div className="flex items-center gap-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClassName(question)}`}>{statusCopy(question)}</span><span className="text-sm font-semibold tabular-nums text-text-primary">{question.awardedScoreUnits} / {question.maxScoreUnits} units</span></div></header><div className="px-5 py-6 sm:px-6"><MathText as="p" text={question.content} className="text-base leading-8 text-text-primary" />{question.assets?.map((asset) => <QuestionImage key={asset.src} imageUrl={asset.src} alt={asset.alt} className="mt-4" />)}
    {question.type === 'single_choice' ? <div className="mt-6 grid gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Đáp án</p>{question.choices.map((choice, choiceIndex) => { const selected = question.studentResponse?.type === 'single_choice' && question.studentResponse.choiceId === choice.id; const correct = question.correctAnswer.correctChoiceId === choice.id; return <div key={choice.id} className={`flex gap-3 rounded-lg border p-3 ${correct ? 'border-success-border bg-success-light' : selected ? 'border-error-border bg-error-light' : 'border-border bg-background'}`}><span className="font-semibold text-text-primary">{String.fromCharCode(65 + choiceIndex)}.</span><div className="min-w-0 flex-1"><MathText as="div" text={choice.content} className="text-sm leading-6 text-text-primary" />{(correct || selected) ? <p className={`mt-1 text-xs font-semibold ${correct ? 'text-success' : 'text-error'}`}>{correct ? 'Đáp án đúng' : 'Bạn đã chọn'}</p> : null}</div></div>; })}</div> : null}
    {question.type === 'true_false_group' ? <TrueFalseReviewTable question={question} /> : null}
    {question.type === 'short_answer' ? <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-border bg-background p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Câu trả lời của bạn</p><p className="mt-2 text-lg font-bold text-text-primary">{question.studentResponse?.type === 'short_answer' ? question.studentResponse.response : 'Chưa trả lời'}</p></div><div className="rounded-lg border border-success-border bg-success-light p-4"><p className="text-xs font-semibold uppercase tracking-wide text-success">Đáp án đúng</p><p className="mt-2 text-lg font-bold text-success">{question.correctAnswer.answer}{question.correctAnswer.tolerance ? ` (sai số: ${question.correctAnswer.tolerance})` : ''}</p></div></div> : null}
  </div></article>;
}
