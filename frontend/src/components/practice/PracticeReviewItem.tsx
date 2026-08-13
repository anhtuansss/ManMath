import { MathText } from '../exam/MathText';
import { OptionImage } from '../exam/OptionImage';
import { QuestionImage } from '../exam/QuestionImage';
import type { QuestionDto } from '../exam/types';

export type ReviewItemData = {
  question: QuestionDto;
  index: number;
  selectedOptionIndex: number | undefined;
  correctOptionIndex: number;
  isCorrect: boolean;
};

export type PracticeReviewItemProps = {
  item: ReviewItemData;
  fallbackTopicName: string;
};

export function PracticeReviewItem({
  item,
  fallbackTopicName,
}: PracticeReviewItemProps) {
  return (
    <article className="rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary">
            {item.index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Câu {item.index + 1}
            </p>
            <p className="mt-0.5 text-xs font-medium text-text-secondary">
              {item.question.subtopic?.name ?? fallbackTopicName}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            item.isCorrect
              ? 'border border-success-border bg-success-light text-success'
              : 'border border-error-border bg-error-light text-error'
          }`}
        >
          {item.isCorrect ? 'Đúng' : 'Cần xem lại'}
        </span>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <MathText
          as="p"
          text={item.question.question}
          className="max-w-3xl text-base leading-8 text-text-primary sm:text-lg sm:leading-9"
        />

        <QuestionImage
          imageUrl={item.question.imageUrl}
          alt={`Hình minh họa câu ${item.index + 1}`}
          className="mt-5"
        />

        <div className="mt-6 space-y-3">
          {item.question.options.map((choice, optionIndex) => {
            const optionLabel = String.fromCharCode(65 + optionIndex);
            const isSelected = item.selectedOptionIndex === optionIndex;
            const isCorrectOption = item.correctOptionIndex === optionIndex;
            const optionImageUrl =
              item.question.optionImageUrls?.[optionIndex] ?? null;

            let optionClass =
              'border-border bg-background text-text-primary';

            if (isCorrectOption) {
              optionClass =
                'border-success-border bg-success-light text-text-primary';
            } else if (isSelected && !item.isCorrect) {
              optionClass =
                'border-error-border bg-error-light text-text-primary';
            }

            return (
              <div
                key={`${item.question.id}-${optionIndex}`}
                className={`rounded-xl border p-4 ${optionClass}`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold ${
                      isCorrectOption
                        ? 'border-success bg-success text-white'
                        : isSelected && !item.isCorrect
                          ? 'border-error bg-error text-white'
                          : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    {optionLabel}
                  </span>

                  <div className="min-w-0 flex-1">
                    <MathText text={choice} className="pt-1 text-base leading-7" />
                    <OptionImage
                      imageUrl={optionImageUrl}
                      alt={`Hình minh họa đáp án ${optionLabel}`}
                      className="mt-2"
                    />

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      {isSelected ? (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
                          Bạn đã chọn
                        </span>
                      ) : null}
                      {isCorrectOption ? (
                        <span className="rounded-full border border-success-border bg-success-light px-2.5 py-1 text-success">
                          Đáp án đúng
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {item.question.explanation ? (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">Lời giải</p>
            <MathText
              as="p"
              text={item.question.explanation}
              className="mt-2 text-sm leading-7 text-text-primary"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
