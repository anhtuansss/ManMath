'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '../../config/api';
import { ExamSidebar } from '../exam/ExamSidebar';
import { Logo } from '../exam/Logo';
import { QuestionList } from '../exam/QuestionList';
import { TimerDisplay } from '../exam/TimerDisplay';
import { PracticeReviewItem } from './PracticeReviewItem';
import type {
  Answers,
  PracticeTopicDto,
  QuestionDto,
} from '../exam/types';

type PracticeClientProps = {
  topicSlug: string;
};

type PracticeResult = {
  correctCount: number;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  score: number;
};

const calculatePracticeResult = (
  questions: QuestionDto[],
  answers: Answers,
): PracticeResult => {
  let correctCount = 0;
  let answeredCount = 0;

  for (const question of questions) {
    const selectedOptionIndex = answers[question.id];

    if (selectedOptionIndex === undefined) {
      continue;
    }

    answeredCount += 1;

    if (question.options[selectedOptionIndex] === question.correctAnswer) {
      correctCount += 1;
    }
  }

  const totalQuestions = questions.length;
  const score =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 10)
      : 0;

  return {
    correctCount,
    totalQuestions,
    answeredCount,
    unansweredCount: totalQuestions - answeredCount,
    score,
  };
};

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const formatTopicTitle = (practice: PracticeTopicDto | null): string => {
  if (!practice) {
    return 'Luyện theo chuyên đề';
  }

  return practice.title;
};

export function PracticeClient({ topicSlug }: PracticeClientProps) {
  const [practice, setPractice] = useState<PracticeTopicDto | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);

  const isSubmitted = result !== null;
  const isTimeUp = remainingSeconds === 0;
  const answeredCount = practice
    ? practice.questions.filter((question) => answers[question.id] !== undefined).length
    : 0;
  const totalQuestions = practice?.questions.length ?? 0;
  const progressPercentage =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  useEffect(() => {
    const fetchPractice = async () => {
      try {
        setLoading(true);
        setError(null);
        setPractice(null);
        setAnswers({});
        setResult(null);
        setShowSubmitConfirm(false);

        const response = await fetch(
          `${API_BASE_URL}/api/practice/topic/${topicSlug}?limit=10`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Không tìm thấy chuyên đề để luyện tập');
          }

          throw new Error('Không tải được bộ luyện tập theo chuyên đề');
        }

        const data: PracticeTopicDto = await response.json();
        setPractice(data);
        setRemainingSeconds(data.durationMinutes * 60);
        setCurrentQuestionId(data.questions[0]?.id ?? null);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Lỗi không xác định khi tải bộ luyện tập',
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchPractice();
  }, [topicSlug]);

  useEffect(() => {
    if (!practice || isSubmitted) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((previousSeconds) => {
        if (previousSeconds <= 1) {
          window.clearInterval(timerId);
          return 0;
        }

        return previousSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [practice, isSubmitted]);

  useEffect(() => {
    if (!practice || isSubmitted || remainingSeconds > 0) {
      return;
    }

    setResult(calculatePracticeResult(practice.questions, answers));
    setShowSubmitConfirm(false);
  }, [answers, isSubmitted, practice, remainingSeconds]);

  useEffect(() => {
    if (!practice?.questions.length || isSubmitted) {
      return;
    }

    const syncCurrentQuestion = () => {
      const stickyHeaderOffset = 120;
      let nextQuestionId = practice.questions[0].id;

      for (const question of practice.questions) {
        const element = document.getElementById(`question-${question.id}`);

        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();

        if (rect.top <= stickyHeaderOffset) {
          nextQuestionId = question.id;
          continue;
        }

        break;
      }

      setCurrentQuestionId(nextQuestionId);
    };

    let frameId = 0;

    const onScroll = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(syncCurrentQuestion);
    };

    syncCurrentQuestion();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [isSubmitted, practice]);

  useEffect(() => {
    if (!practice || isSubmitted || showSubmitConfirm) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const currentIndex = practice.questions.findIndex(
        (question) => question.id === currentQuestionId,
      );

      if (event.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          event.preventDefault();
          handleQuestionNavigate(practice.questions[currentIndex - 1].id);
        }
      } else if (event.key === 'ArrowRight') {
        if (currentIndex < practice.questions.length - 1 && currentIndex !== -1) {
          event.preventDefault();
          handleQuestionNavigate(practice.questions[currentIndex + 1].id);
        }
      } else if (['1', '2', '3', '4'].includes(event.key) && currentQuestionId !== null) {
        event.preventDefault();
        handleSelectAnswer(currentQuestionId, Number(event.key) - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionId, isSubmitted, practice, showSubmitConfirm]);

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [questionId]: optionIndex,
    }));
  };

  const handleQuestionNavigate = (questionId: number) => {
    setCurrentQuestionId(questionId);
    document
      .getElementById(`question-${questionId}`)
      ?.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  const handleSubmit = () => {
    if (!practice) {
      return;
    }

    setResult(calculatePracticeResult(practice.questions, answers));
    setShowSubmitConfirm(false);
  };

  const handleRestart = () => {
    if (!practice) {
      return;
    }

    setAnswers({});
    setResult(null);
    setShowSubmitConfirm(false);
    setRemainingSeconds(practice.durationMinutes * 60);
    setCurrentQuestionId(practice.questions[0]?.id ?? null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const reviewItems = useMemo(() => {
    if (!practice || !result) {
      return [];
    }

    return practice.questions.map((question, index) => {
      const selectedOptionIndex = answers[question.id];
      const correctOptionIndex = question.options.indexOf(question.correctAnswer);

      return {
        index,
        question,
        selectedOptionIndex,
        correctOptionIndex,
        isCorrect:
          selectedOptionIndex !== undefined &&
          selectedOptionIndex === correctOptionIndex,
      };
    });
  }, [answers, practice, result]);

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-background px-4 py-10 text-text-primary sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-16 rounded-xl border border-border bg-surface shadow-card" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <div className="h-16 rounded-xl border border-border bg-surface shadow-card" />
              <div className="h-[420px] rounded-xl border border-border bg-surface shadow-card" />
            </div>
            <div className="h-[280px] rounded-xl border border-border bg-surface shadow-card" />
          </div>
        </div>
      </main>
    );
  }

  if (practice && practice.questions.length === 0) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-text-primary">
        <section className="w-full max-w-xl rounded-xl border border-border bg-surface p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v14.5A1.5 1.5 0 0 1 17.5 20H7.25A2.25 2.25 0 0 1 5 17.75V6.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M8 8h7M8 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-outfit)] text-2xl font-bold text-text-primary">
            Chưa có câu hỏi cho chuyên đề này
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Chuyên đề đã tồn tại nhưng chưa có câu hỏi luyện tập phù hợp. Hãy quay lại analytics hoặc chọn một đề khác.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/analytics"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
            >
              Quay về analytics
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt"
            >
              Xem danh sách đề
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (error || !practice) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-text-primary">
        <section className="w-full max-w-xl rounded-xl border border-border bg-surface p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-light text-error">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M12 8v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16" r="0.75" fill="currentColor" />
            </svg>
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-outfit)] text-2xl font-bold text-text-primary">
            Không mở được bộ luyện tập
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {error ?? 'Không tìm thấy bộ luyện tập theo chuyên đề này.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/analytics"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
            >
              Quay về analytics
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt"
            >
              Xem danh sách đề
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (isSubmitted && result) {
    const accuracy =
      result.totalQuestions > 0 ? result.correctCount / result.totalQuestions : 0;

    return (
      <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/dashboard"
                aria-label="Ve trang chu"
                className="group inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Logo className="h-10 w-10 transition-transform group-hover:scale-105" />
                <span className="text-sm font-semibold text-text-primary group-hover:text-primary">
                  ManMath
                </span>
              </Link>
              <p className="mt-6 text-sm font-semibold text-primary">
                Luyện theo chuyên đề
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-text-primary">
                {formatTopicTitle(practice)}
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Bài luyện này được chấm điểm local trên frontend và không lưu vào lịch sử làm bài.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
              >
                Luyện lại chuyên đề
              </button>
              <Link
                href="/analytics"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt"
              >
                Quay về analytics
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt"
              >
                Xem danh sách đề
              </Link>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border border-t-[3px] border-t-primary bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold text-text-secondary">Điểm</p>
              <p className="mt-2 text-3xl font-bold text-primary">{result.score}</p>
            </div>
            <div className="rounded-xl border border-border border-t-[3px] border-t-success bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold text-text-secondary">Số câu đúng</p>
              <p className="mt-2 text-3xl font-bold text-success">
                {result.correctCount}/{result.totalQuestions}
              </p>
            </div>
            <div className="rounded-xl border border-border border-t-[3px] border-t-accent bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold text-text-secondary">Độ chính xác</p>
              <p className="mt-2 text-3xl font-bold text-accent">
                {formatPercent(accuracy)}
              </p>
            </div>
            <div className="rounded-xl border border-border border-t-[3px] border-t-warning bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold text-text-secondary">Chưa làm</p>
              <p className="mt-2 text-3xl font-bold text-warning">
                {result.unansweredCount}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-text-primary">
                  Review nhanh
                </h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Xem lại câu sai, câu chưa làm và lời giải để ôn đúng trọng tâm.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-success-border bg-success-light px-3 py-1 text-success">
                  Đúng {result.correctCount}
                </span>
                <span className="rounded-full border border-error-border bg-error-light px-3 py-1 text-error">
                  Cần xem lại {result.totalQuestions - result.correctCount}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {reviewItems.map((item) => (
              <PracticeReviewItem
                key={item.question.id}
                item={item}
                fallbackTopicName={practice.topic.name}
              />
            ))}
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-text-primary">
      {showSubmitConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-card">
            <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-text-primary">
              Xác nhận nộp bài luyện
            </h2>
            <p className="mt-4 text-sm leading-6 text-text-secondary">
              Bạn đã hoàn thành{' '}
              <span className="font-semibold text-text-primary">
                {Object.keys(answers).length}/{practice.questions.length}
              </span>{' '}
              câu. Nộp bài ngay bây giờ để xem kết quả local?
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
              >
                Nộp bài
              </button>
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt"
              >
                Tiếp tục làm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm shadow-header">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Về trang chủ"
              className="group flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Logo className="h-8 w-8 transition-transform group-hover:scale-105" />
            </Link>

            <div className="min-w-0">
              <p className="text-xs font-medium text-text-secondary">
                {practice.questions.length} câu hỏi
              </p>
              <h1 className="mt-0.5 truncate font-[family-name:var(--font-outfit)] text-base font-semibold text-text-primary sm:text-lg">
                Luyện chuyên đề: {practice.topic.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <TimerDisplay remainingSeconds={remainingSeconds} />
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isTimeUp}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:bg-primary-hover disabled:cursor-not-allowed disabled:bg-background-alt disabled:text-text-muted"
            >
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
                  d="M13.354 2.646a.5.5 0 0 1 .058.638l-.058.07L6.707 10l-3-3a.5.5 0 0 1 .638-.765l.07.058L7 8.586l6.293-6.293a.5.5 0 0 1 .708 0l-.647.353Z"
                  fill="currentColor"
                />
                <path
                  d="M14.5 8a.5.5 0 0 1 .492.41L15 8.5V12a3 3 0 0 1-2.824 2.995L12 15H4a3 3 0 0 1-2.995-2.824L1 12V4a3 3 0 0 1 2.824-2.995L4 1h5.5a.5.5 0 0 1 .09.992L9.5 2H4a2 2 0 0 0-1.995 1.85L2 4v8a2 2 0 0 0 1.85 1.995L4 14h8a2 2 0 0 0 1.995-1.85L14 12V8.5a.5.5 0 0 1 .5-.5Z"
                  fill="currentColor"
                />
              </svg>
              Nộp bài
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl border border-border bg-surface px-5 py-5 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Luyện theo chuyên đề</p>
              <h2 className="mt-1 font-[family-name:var(--font-outfit)] text-2xl font-bold text-text-primary">
                {practice.topic.name}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Làm nhanh các câu cùng chuyên đề để tự kiểm tra lỗ hổng kiến thức. Kết quả được chấm local và không lưu vào lịch sử làm bài.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-border bg-background px-3 py-1 text-text-secondary">
                {practice.questions.length} câu
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-text-secondary">
                {practice.durationMinutes} phút
              </span>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                {practice.topic.slug}
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-text-primary">Tiến độ luyện tập</span>
              <span className="font-semibold text-text-primary">
                {answeredCount}/{totalQuestions} câu đã trả lời
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background-alt">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/analytics"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt"
              >
                Quay về analytics
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt"
              >
                Xem danh sách đề
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <QuestionList
            questions={practice.questions}
            answers={answers}
            isTimeUp={isTimeUp}
            onSelectAnswer={handleSelectAnswer}
          />
          <ExamSidebar
            questions={practice.questions}
            answers={answers}
            isTimeUp={isTimeUp}
            onQuestionClick={handleQuestionNavigate}
            currentQuestionId={currentQuestionId}
          />
        </div>
      </main>
    </div>
  );
}
