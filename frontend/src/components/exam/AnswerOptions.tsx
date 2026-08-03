import { MathText } from './MathText';
import { OptionImage } from './OptionImage';
import type { Answers, Question } from './types';

type AnswerOptionsProps = {
  question: Question;
  answers: Answers;
  isTimeUp: boolean;
  onSelectAnswer: (questionId: number, optionIndex: number) => void;
};

export function AnswerOptions({
  question,
  answers,
  isTimeUp,
  onSelectAnswer,
}: AnswerOptionsProps) {
  return (
    <div className="space-y-3">
      {question.options.map((choice, choiceIndex) => {
        const isSelected = answers[question.id] === choiceIndex;
        const optionLabel = String.fromCharCode(65 + choiceIndex);
        const optionImageUrl = question.optionImageUrls?.[choiceIndex] ?? null;

        return (
          <button
            key={choiceIndex}
            type="button"
            aria-pressed={isSelected}
            disabled={isTimeUp}
            onClick={() => onSelectAnswer(question.id, choiceIndex)}
            className={`
              group flex w-full cursor-pointer items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.985]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              disabled:cursor-not-allowed disabled:border-border disabled:bg-background-alt disabled:text-text-muted
              ${isSelected
                ? 'border-primary bg-primary-light/30 text-text-primary'
                : 'border-border bg-surface text-text-primary hover:border-border-hover hover:bg-background-alt'
              }
            `}
          >
            <span
              className={`
                flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition-all duration-200
                ${isSelected
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-background text-text-secondary group-hover:border-primary-hover group-hover:text-primary'
                }
              `}
              aria-hidden="true"
            >
              {optionLabel}
            </span>

            <div className="min-w-0 flex-1">
              <MathText
                text={choice}
                className="pt-1 text-base leading-7"
              />

              <OptionImage
                imageUrl={optionImageUrl}
                alt={`Hình minh họa đáp án ${optionLabel}`}
                className="mt-2"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
