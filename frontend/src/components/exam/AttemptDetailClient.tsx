'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import {
  fetchProtectedJson,
  isUnauthorizedError,
} from '../../lib/authApi';
import { subscribeAuthTokenChange } from '../../lib/authStorage';
import { MathText } from './MathText';
import { OptionImage } from './OptionImage';
import { QuestionImage } from './QuestionImage';
import { ReviewQuestionNavigator, type ReviewNavigatorItem } from './ReviewQuestionNavigator';
import type { ExamAttemptDetailDto } from './types';

type AttemptDetailClientProps = {
  attemptId: string;
};

type AttemptDetailErrorType = 'unauthorized' | 'generic';

const formatSubmittedAt = (submittedAt: string) => {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(submittedAt));
};

const formatDurationSeconds = (durationSeconds: number | null) => {
  if (durationSeconds === null) {
    return 'Chưa ghi nhận';
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }

  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }

  return `${seconds} giây`;
};

export function AttemptDetailClient({ attemptId }: AttemptDetailClientProps) {
  const [attemptDetail, setAttemptDetail] = useState<ExamAttemptDetailDto | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<AttemptDetailErrorType | null>(null);

  const fetchAttemptDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorType(null);

      const data = await fetchProtectedJson<ExamAttemptDetailDto>(
        `/api/attempts/${attemptId}`,
      );
      setAttemptDetail(data);
    } catch (fetchError: unknown) {
      if (isUnauthorizedError(fetchError)) {
        setAttemptDetail(null);
        setErrorType('unauthorized');
        setError('Bạn cần đăng nhập để xem lịch sử làm bài.');
      } else {
        setErrorType('generic');
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Lỗi không xác định khi tải chi tiết lần làm bài',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAttemptDetail();
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => {
      void fetchAttemptDetail();
    });

    return () => {
      unsubscribeAuthTokenChange();
    };
  }, [attemptId]);

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary">
        <div className="mx-auto w-full max-w-6xl animate-fade-in space-y-6">
          <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="h-6 w-32 animate-pulse rounded bg-background-alt" />
              <div className="mt-6 h-8 w-64 animate-pulse rounded bg-background-alt" />
              <div className="mt-2 h-4 w-40 animate-pulse rounded bg-background-alt" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-32 animate-pulse rounded-lg bg-background-alt" />
              <div className="h-10 w-32 animate-pulse rounded-lg bg-primary-light" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <div className="h-4 w-16 animate-pulse rounded bg-background-alt" />
                <div className="mt-2 h-8 w-24 animate-pulse rounded bg-background-alt" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-background-alt" />
            <div className="h-48 animate-pulse rounded-xl border border-border bg-surface shadow-card" />
          </div>
        </div>
      </main>
    );
  }

  if (errorType === 'unauthorized') {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-text-primary">
        <section className="flex w-full max-w-xl animate-fade-in flex-col items-center rounded-xl border border-border bg-surface p-8 text-center shadow-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 10V7a5 5 0 0110 0v3M6.5 10h11A1.5 1.5 0 0119 11.5v7A1.5 1.5 0 0117.5 20h-11A1.5 1.5 0 015 18.5v-7A1.5 1.5 0 016.5 10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-text-primary">
            Bạn cần đăng nhập để xem lịch sử làm bài.
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
            Chi tiết lần làm bài chỉ hiển thị cho tài khoản đã đăng nhập.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Về danh sách đề
          </Link>
        </section>
      </main>
    );
  }

  if (error || !attemptDetail) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-text-primary">
        <section className="w-full max-w-xl animate-fade-in rounded-xl border border-error-border bg-surface p-8 shadow-card text-center flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-light text-error">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-error">
            Không xem được lần làm bài
          </h1>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Về danh sách đề
          </Link>
        </section>
      </main>
    );
  }

  const { attempt, exam, answers, topicStats } = attemptDetail;
  const accuracy =
    attempt.totalQuestions > 0
      ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
      : 0;
  const incorrectCount =
    attempt.totalQuestions - attempt.correctCount - attempt.unansweredCount;
  const durationLabel = formatDurationSeconds(attempt.durationSeconds);

  const navigatorItems: ReviewNavigatorItem[] = answers.map((answer, index) => {
    const isUnanswered = answer.selectedOptionIndex === null;
    const status = isUnanswered ? 'unanswered' : answer.isCorrect ? 'correct' : 'incorrect';
    return {
      id: answer.questionId,
      label: (index + 1).toString(),
      status,
    };
  });

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl animate-fade-in flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              aria-label="Về trang chủ"
              className="group inline-flex cursor-pointer items-center gap-3 rounded-lg text-sm font-semibold text-text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Logo className="h-9 w-9 transition-transform group-hover:scale-105" />
              <span className="transition-colors group-hover:text-primary">ManMath</span>
            </Link>

            <p className="mt-6 text-sm font-semibold text-primary">
              {exam.title}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-text-primary">
              Chi tiết lần làm bài
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Thời gian làm bài: {durationLabel}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Nộp lúc {formatSubmittedAt(attempt.submittedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/exam/${exam.id}/attempts`}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 12L2 8l4-4M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Lịch sử đề này
            </Link>
            <Link
              href={`/exam/${exam.id}`}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M11 2l1 2-2 1M5 14l-1-2 2-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Làm lại đề
            </Link>
            <Link
              href="/analytics"
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Phân tích học tập
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 8h8M4 8l4-4M4 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Về danh sách đề
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-border border-t-[3px] border-t-text-secondary bg-surface p-5 shadow-card">
            <p className="text-xs font-semibold text-text-secondary">Thời gian</p>
            <p className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl">
              {durationLabel}
            </p>
          </div>
          <div className="rounded-xl border border-border border-t-[3px] border-t-primary bg-surface p-5 shadow-card">
            <p className="text-xs font-semibold text-text-secondary">Điểm</p>
            <p className="mt-2 text-2xl font-bold text-primary sm:text-3xl">
              {attempt.score}/10
            </p>
          </div>
          <div className="rounded-xl border border-border border-t-[3px] border-t-success bg-surface p-5 shadow-card">
            <p className="text-xs font-semibold text-text-secondary">Đúng</p>
            <p className="mt-2 text-2xl font-bold text-success sm:text-3xl">
              {attempt.correctCount}/{attempt.totalQuestions}
            </p>
          </div>
          <div className="rounded-xl border border-border border-t-[3px] border-t-error bg-surface p-5 shadow-card">
            <p className="text-xs font-semibold text-text-secondary">Sai</p>
            <p className="mt-2 text-2xl font-bold text-error sm:text-3xl">
              {incorrectCount}
            </p>
          </div>
          <div className="rounded-xl border border-border border-t-[3px] border-t-accent bg-surface p-5 shadow-card">
            <p className="text-xs font-semibold text-text-secondary">Tỷ lệ đúng</p>
            <p className="mt-2 text-2xl font-bold text-accent sm:text-3xl">
              {accuracy}%
            </p>
          </div>
        </section>
        
        {topicStats.length > 0 && (
          <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="flex flex-col gap-1">
              <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
                Phân tích theo chuyên đề
              </h2>
              <p className="text-sm text-text-secondary">
                Tỷ lệ đúng của từng nhóm kiến thức trong lần làm bài này.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {topicStats.map((topicStat) => (
                <div
                  key={topicStat.topicId ?? topicStat.topicName}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary truncate" title={topicStat.topicName}>
                        {topicStat.topicName}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {topicStat.correct}/{topicStat.total} câu
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                      {topicStat.accuracy}%
                    </span>
                  </div>

                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background-alt">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${topicStat.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
              Review đáp án
            </h2>
            <p className="text-sm text-text-secondary">
              Xem lại đáp án đã chọn và đáp án đúng của từng câu.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse items-start gap-6 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-4">
              {answers.map((answer, index) => {
              const selectedAnswer =
                answer.selectedOptionIndex === null
                  ? 'Chưa chọn đáp án'
                  : answer.options[answer.selectedOptionIndex];
              const selectedOptionImageUrl =
                answer.selectedOptionIndex === null
                  ? null
                  : answer.optionImageUrls?.[answer.selectedOptionIndex] ?? null;

              const correctAnswer = answer.options[answer.correctOptionIndex];
              const correctOptionImageUrl =
                answer.optionImageUrls?.[answer.correctOptionIndex] ?? null;

              const isUnanswered = answer.selectedOptionIndex === null;

              const statusAccentClass = isUnanswered
                ? 'border-l-warning'
                : answer.isCorrect
                  ? 'border-l-success'
                  : 'border-l-error';

              const statusBadgeClass = isUnanswered
                ? 'bg-warning-light text-warning border-warning-border'
                : answer.isCorrect
                  ? 'bg-success-light text-success border-success-border'
                  : 'bg-error-light text-error border-error-border';

              const statusLabel = isUnanswered
                ? 'Chưa làm'
                : answer.isCorrect
                  ? 'Đúng'
                  : 'Sai';

              const answerBoxClass = isUnanswered
                ? 'border-warning-border bg-warning-light/50'
                : answer.isCorrect
                  ? 'border-success-border bg-success-light/50'
                  : 'border-error-border bg-error-light/50';

              const statusHeaderClass = isUnanswered
                ? 'bg-warning/5'
                : answer.isCorrect
                  ? 'bg-success/5'
                  : 'bg-error/5';

              return (
                <article
                  id={`question-${answer.questionId}`}
                  key={answer.questionId}
                  className={`overflow-hidden rounded-xl border border-border bg-surface shadow-card border-l-[6px] ${statusAccentClass}`}
                >
                  <div className={`flex items-center justify-between border-b border-border px-4 py-2.5 ${statusHeaderClass}`}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold text-text-primary shadow-sm border border-border">
                        {index + 1}
                      </span>
                      <span className="text-xs font-medium text-text-secondary">
                        ID: {answer.questionId}
                      </span>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5">
                    <MathText
                      as="p"
                      text={answer.question}
                      className="text-sm sm:text-base leading-7 text-text-primary"
                    />

                    <QuestionImage
                      imageUrl={answer.imageUrl}
                      alt={`Hình minh họa câu ${index + 1}`}
                      className="mt-3 sm:mt-4"
                    />

                    <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
                      <div className={`rounded-lg border p-3 sm:p-4 ${answerBoxClass}`}>
                        <p className="text-xs font-semibold text-text-secondary">
                          Đáp án của bạn
                        </p>
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
                        <p className="text-xs font-semibold text-text-secondary">
                          Đáp án đúng
                        </p>
                        <MathText
                          as="p"
                          text={correctAnswer}
                          className="mt-1.5 sm:mt-2 text-sm font-medium leading-6 text-text-primary"
                        />
                        <OptionImage
                          imageUrl={correctOptionImageUrl}
                          alt={`Hình minh họa đáp án đúng ở câu ${index + 1}`}
                          className="mt-2 sm:mt-3"
                        />
                      </div>
                    </div>

                    {answer.explanation ? (
                      <div className="mt-4 sm:mt-5 rounded-lg bg-background-alt p-3 sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1.5 sm:mb-2">
                          Lời giải
                        </p>
                        <MathText
                          as="div"
                          text={answer.explanation}
                          className="text-sm leading-6 text-text-primary"
                        />
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
            </div>

            <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-80">
              <ReviewQuestionNavigator items={navigatorItems} />
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
