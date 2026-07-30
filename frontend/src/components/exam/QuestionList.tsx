import { AnswerOptions } from './AnswerOptions';
import { MathText } from './MathText';
import { QuestionImage } from './QuestionImage';
import type { Answers, Question } from './types';

type QuestionListProps = {
  questions?: Question[];
  answers: Answers;
  isTimeUp: boolean;
  onSelectAnswer: (questionId: number, optionIndex: number) => void;
};

export function QuestionList({
  questions,
  answers,
  isTimeUp,
  onSelectAnswer,
}: QuestionListProps) {
  const totalQuestions = questions?.length ?? 0;

  return (
    <div className="space-y-8">
      {questions?.map((question, index) => (
        <article
          id={`question-${question.id}`}
          key={question.id}
          className="scroll-mt-28 rounded-xl border border-border bg-surface shadow-card animate-fade-in"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Câu {index + 1}
                </p>
                <p className="mt-0.5 text-xs font-medium text-text-secondary">
                  {index + 1}/{totalQuestions}
                </p>
              </div>
            </div>

            {answers[question.id] !== undefined && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-light px-2.5 py-1 text-xs font-semibold text-success">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M13.354 4.646a.5.5 0 0 1 0 .708l-6.5 6.5a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L6.5 10.793l6.146-6.147a.5.5 0 0 1 .708 0Z"
                    fill="currentColor"
                  />
                </svg>
                Đã chọn đáp án
              </span>
            )}
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <MathText
              as="p"
              text={question.question}
              className="max-w-3xl text-base leading-8 text-text-primary sm:text-lg sm:leading-9"
            />

            <QuestionImage
              imageUrl={question.imageUrl}
              alt={`Hình minh họa câu ${index + 1}`}
              className="mt-5"
            />

            <div className="mt-7">
              <AnswerOptions
                question={question}
                answers={answers}
                isTimeUp={isTimeUp}
                onSelectAnswer={onSelectAnswer}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
