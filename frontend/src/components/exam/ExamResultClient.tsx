'use client';

/**
 * Mục đích:
 * Component chạy phía trình duyệt cho trang kết quả. Đọc kết quả tạm sau khi nộp bài,
 * hiển thị tổng kết điểm và phần xem lại từng câu, đồng thời xử lý luồng làm lại đề.
 *
 * Luồng dữ liệu:
 * sessionStorage -> ExamResultSession -> hiển thị điểm và phần xem lại đáp án.
 * Nếu session không có bản chụp dữ liệu đề, gọi dự phòng GET /api/exams/:id
 * để lấy câu hỏi.
 *
 * File liên quan:
 * frontend/src/components/exam/ExamTakingClient.tsx
 * frontend/src/lib/storage.ts
 * backend/server.ts
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MathText } from './MathText';
import { Logo } from './Logo';
import { OptionImage } from './OptionImage';
import { QuestionImage } from './QuestionImage';
import { ResultQuestionNavigator } from './ResultQuestionNavigator';
import type { ExamDetailDto, ExamResultSession, QuestionDto } from './types';
import { API_BASE_URL } from '../../config/api';
import {
  getExamAnswersKey,
  getExamResultKey,
  readResultStorage,
  removeStorageItem,
} from '../../lib/storage';

type ExamResultClientProps = {
  examId: string;
};

type ReviewStatus = 'correct' | 'incorrect' | 'unanswered';

const getReviewStatus = (
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
  correct: 'border-l-[6px] border-l-success',
  incorrect: 'border-l-[6px] border-l-error',
  unanswered: 'border-l-[6px] border-l-warning',
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

const getScoreLabel = (score: number) => {
  if (score >= 9) return 'Xuất sắc! Bạn đã nắm rất chắc kiến thức.';
  if (score >= 8) return 'Rất tốt! Tốc độ và độ chính xác ấn tượng.';
  if (score >= 6.5) return 'Khá! Cố gắng hạn chế sai sót ở các câu dễ.';
  if (score >= 5) return 'Đạt mức cơ bản! Bạn cần tăng cường luyện tập thêm.';
  return 'Chưa đạt mục tiêu — hãy củng cố lại nền tảng trước khi làm lại.';
};

const getNextActionText = (score: number) => {
  if (score >= 8) {
    return 'Duy trì phong độ này. Hãy thử sức với các đề vận dụng cao hơn hoặc review nhanh các câu làm sai (nếu có).';
  }
  if (score >= 5) {
    return 'Hãy xem lại kỹ các câu sai trước khi bắt đầu một đề mới để không lặp lại lỗi.';
  }
  return 'Đừng nản lòng! Hãy đối chiếu đáp án từng câu và ôn lại các công thức quan trọng.';
};

function ResultEmptyState({ examId }: ExamResultClientProps) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-text-primary">
      <section className="w-full max-w-xl animate-fade-in rounded-xl border border-border bg-surface p-8 shadow-card">
        {/* Logo */}
        <Link href="/" aria-label="Về trang chủ" className="group flex cursor-pointer items-center gap-3 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <Logo className="h-10 w-10 transition-transform group-hover:scale-105" />
          <div>
            <p className="font-[family-name:var(--font-outfit)] text-base font-bold text-text-primary transition-colors group-hover:text-primary">ManMath</p>
            <p className="text-xs font-medium text-text-secondary">
              Trang kết quả bài làm
            </p>
          </div>
        </Link>

        {/* Empty icon */}
        <div className="mt-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-alt">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-text-muted" aria-hidden="true">
              <path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h1 className="mt-5 text-center font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-text-primary">
          Chưa có kết quả bài làm
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-6 text-text-secondary">
          Trang này chỉ hiển thị sau khi bạn nộp bài. Nếu bạn mở trực tiếp URL
          kết quả, hãy quay lại danh sách đề hoặc làm đề hiện tại trước.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Về danh sách đề
          </Link>
          <Link
            href={`/exam/${examId}`}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Làm đề này
          </Link>
        </div>
      </section>
    </main>
  );
}

export function ExamResultClient({ examId }: ExamResultClientProps) {
  const router = useRouter();
  const [resultSession, setResultSession] = useState<ExamResultSession | null>(null);
  const [exam, setExam] = useState<ExamDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [revealState, setRevealState] = useState<'calculating' | 'revealed'>('calculating');

  useEffect(() => {
    if (!loading && resultSession) {
      const t = setTimeout(() => setRevealState('revealed'), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, resultSession]);

  /**
   * Tải kết quả nộp bài từ sessionStorage. Ở MVP, trang kết quả cố ý dựa vào
   * storage tạm, nên nếu mở URL trực tiếp khi chưa nộp bài thì hiển thị trạng thái rỗng.
   */
  useEffect(() => {
    let isActive = true;

    const loadResult = async () => {
      setLoading(true);
      setReviewError(null);

      const storedResult = readResultStorage(sessionStorage, examId);

      if (!storedResult) {
        if (!isActive) return;
        setResultSession(null);
        setExam(null);
        setLoading(false);
        return;
      }

      if (!isActive) return;
      setResultSession(storedResult);

      if (storedResult.exam) {
        setExam(storedResult.exam);
        setLoading(false);
        return;
      }

      // Session cũ có thể chưa có bản chụp dữ liệu đề, nên tải chi tiết để vẫn xem lại được.
      try {
        const response = await fetch(`${API_BASE_URL}/api/exams/${examId}`);

        if (!response.ok) {
          throw new Error('Không tải được chi tiết đề để review đáp án');
        }

        const examData: ExamDetailDto = await response.json();

        if (!isActive) return;
        setExam(examData);
      } catch (error) {
        if (!isActive) return;
        setReviewError(
          error instanceof Error
            ? error.message
            : 'Không tải được chi tiết đề để review đáp án',
        );
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadResult();

    return () => {
      isActive = false;
    };
  }, [examId]);

  const handleRetakeExam = () => {
    // Làm lại đề cần bắt đầu sạch: xóa cả kết quả tạm và đáp án đã lưu nháp.
    removeStorageItem(sessionStorage, getExamResultKey(examId));
    removeStorageItem(localStorage, getExamAnswersKey(examId));
    router.push(`/exam/${examId}`);
  };

  const scrollToReview = () => {
    document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-background px-4 py-8 text-text-primary sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl animate-fade-in">
          {/* Header skeleton */}
          <div className="mb-6 flex items-center justify-between border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-primary-light" />
                <div>
                  <div className="h-4 w-20 animate-pulse rounded-md bg-primary-light" />
                  <div className="mt-1 h-3 w-28 animate-pulse rounded-md bg-background-alt" />
                </div>
              </div>
              <div className="mt-6 h-8 w-64 animate-pulse rounded-md bg-background-alt" />
              <div className="mt-3 h-4 w-48 animate-pulse rounded-md bg-background-alt" />
            </div>
            <div className="hidden gap-3 sm:flex">
              <div className="h-10 w-28 animate-pulse rounded-lg bg-background-alt" />
              <div className="h-10 w-28 animate-pulse rounded-lg bg-background-alt" />
              <div className="h-10 w-32 animate-pulse rounded-lg bg-primary-light" />
            </div>
          </div>
          {/* Cards skeleton */}
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="h-80 animate-pulse rounded-xl border border-border bg-surface shadow-card" />
            <div className="h-80 animate-pulse rounded-xl border border-border bg-surface shadow-card" />
          </div>
          {/* Review skeleton */}
          <div className="mt-6 space-y-3">
            <div className="h-6 w-40 animate-pulse rounded-md bg-background-alt" />
            <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" />
            <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" />
          </div>
        </div>
      </main>
    );
  }

  if (revealState === 'calculating') {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10 text-text-primary">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-surface shadow-card">
            <svg className="h-10 w-10 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping"></div>
          </div>
          <h1 className="mt-8 font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-text-primary">
            Đang chấm điểm...
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Vui lòng đợi trong giây lát
          </p>
        </div>
      </main>
    );
  }

  if (!resultSession) {
    return <ResultEmptyState examId={examId} />;
  }

  const { submitResult } = resultSession;
  const topicStats = submitResult.topicStats ?? [];
  const answeredCount =
    exam?.questions.filter((question) => resultSession.answers[question.id] !== undefined)
      .length ?? Object.keys(resultSession.answers).length;
  const unansweredCount = Math.max(submitResult.totalQuestions - answeredCount, 0);
  const incorrectCount = Math.max(
    submitResult.totalQuestions - submitResult.correctCount - unansweredCount,
    0,
  );
  const accuracy =
    submitResult.totalQuestions > 0
      ? Math.round((submitResult.correctCount / submitResult.totalQuestions) * 100)
      : 0;
  const scoreRingBackground = `conic-gradient(var(--color-primary) ${accuracy * 3.6}deg, var(--color-border) 0deg)`;

  const wrongOrSkippedNumbers = exam?.questions
    .map((q, index) => {
      const status = getReviewStatus(q, resultSession.answers[q.id]);
      return status !== 'correct' ? index + 1 : null;
    })
    .filter(Boolean) as number[];

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl animate-fade-in flex-col gap-6">
        {/* ── Header ── */}
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {/* Logo */}
            <Link href="/" aria-label="Về trang chủ" className="group flex cursor-pointer items-center gap-3 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <Logo className="h-10 w-10 transition-transform group-hover:scale-105" />
              <div>
                <p className="font-[family-name:var(--font-outfit)] text-base font-bold text-text-primary transition-colors group-hover:text-primary">ManMath</p>
                <p className="text-xs font-medium text-text-secondary">
                  Kết quả bài thi
                </p>
              </div>
            </Link>

            <h1 className="mt-6 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-text-primary">
              Tổng kết bài làm
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {resultSession.examTitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={scrollToReview}
              className="inline-flex h-10 cursor-pointer items-center gap-2 justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Xem lại chi tiết
            </button>
            <button
              type="button"
              onClick={handleRetakeExam}
              className="inline-flex h-10 cursor-pointer items-center gap-2 justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2.5 8a5.5 5.5 0 019.3-4M13.5 8a5.5 5.5 0 01-9.3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M11 2l1 2-2 1M5 14l-1-2 2-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Làm lại đề
            </button>
            <Link
              href={`/exam/${examId}/attempts`}
              className="inline-flex h-10 cursor-pointer items-center gap-2 justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Xem lịch sử
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 cursor-pointer items-center gap-2 justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 8h8M4 8l4-4M4 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Về danh sách đề
            </Link>
          </div>
        </header>

        {/* ── Score & Stats row ── */}
        <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Score Card */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-card">
            {/* Subtle glow background */}
            <div className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-[200px] w-[200px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
            
            <p className="text-sm font-semibold text-text-secondary">Điểm số</p>
            <div className="mt-5 flex items-center justify-center">
              <div
                className="flex h-44 w-44 animate-spring-up items-center justify-center rounded-full p-2"
                style={{ background: scoreRingBackground }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-surface">
                  <div className="text-center">
                    <p className="font-[family-name:var(--font-outfit)] text-5xl font-bold text-primary transition-transform duration-500 hover:scale-110">
                      {submitResult.score.toFixed(1)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-secondary">
                      / 10 điểm
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-primary-light bg-primary-50 px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">
                {getScoreLabel(submitResult.score)}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {getNextActionText(submitResult.score)}
              </p>
            </div>

            {/* Cần cải thiện Section */}
            {wrongOrSkippedNumbers && wrongOrSkippedNumbers.length > 0 && (
              <div className="mt-4 rounded-lg border border-warning-border bg-warning-light/50 px-4 py-3">
                <p className="text-sm font-semibold text-text-primary">
                  Cần cải thiện
                </p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Bạn cần xem lại các câu: <span className="font-semibold text-text-primary">{wrongOrSkippedNumbers.join(', ')}</span>. Hãy đối chiếu lời giải hoặc kiến thức trên lớp để tìm ra dạng bài còn yếu.
                </p>
              </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-text-primary">
                Thống kê bài làm
              </h2>
              <p className="text-sm text-text-secondary">
                Tổng quan nhanh để biết phần nào cần xem lại trước.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {/* Correct */}
              <div className="rounded-lg border border-border border-t-[3px] border-t-success bg-background p-4">
                <p className="text-xs font-semibold text-text-secondary">Số câu đúng</p>
                <p className="mt-2 text-2xl font-bold text-success">
                  {submitResult.correctCount}
                </p>
              </div>
              {/* Incorrect */}
              <div className="rounded-lg border border-border border-t-[3px] border-t-error bg-background p-4">
                <p className="text-xs font-semibold text-text-secondary">Số câu sai</p>
                <p className="mt-2 text-2xl font-bold text-error">
                  {incorrectCount}
                </p>
              </div>
              {/* Unanswered */}
              <div className="rounded-lg border border-border border-t-[3px] border-t-warning bg-background p-4">
                <p className="text-xs font-semibold text-text-secondary">Chưa làm</p>
                <p className="mt-2 text-2xl font-bold text-warning">
                  {unansweredCount}
                </p>
              </div>
              {/* Accuracy */}
              <div className="rounded-lg border border-border border-t-[3px] border-t-primary bg-background p-4">
                <p className="text-xs font-semibold text-text-secondary">Tỷ lệ đúng</p>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {accuracy}%
                </p>
              </div>
            </div>

            {/* Completion progress bar */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-text-secondary">Hoàn thành</span>
                <span className="font-semibold text-text-primary">
                  {answeredCount}/{submitResult.totalQuestions} câu
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background-alt">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${
                      submitResult.totalQuestions > 0
                        ? (answeredCount / submitResult.totalQuestions) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Review Section ── */}
        {topicStats.length > 0 && (
          <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <div className="flex flex-col gap-1">
              <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
                Phân tích theo chuyên đề
              </h2>
              <p className="text-sm leading-6 text-text-secondary">
                Các chuyên đề có tỷ lệ đúng thấp hơn được đặt lên trước để bạn ưu tiên xem lại.
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

        <section id="review-section" className="space-y-4 scroll-mt-24">
          <div className="flex flex-col gap-1">
            <h2 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-text-primary">
              <span className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-primary" aria-hidden="true">
                  <path d="M9 5h6M9 9h6M9 13h4M3 5h2v2H3V5zM3 9h2v2H3V9zM3 13h2v2H3v-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Review đáp án
              </span>
            </h2>
            <p className="text-sm text-text-secondary">
              So sánh đáp án bạn chọn với đáp án đúng của từng câu.
            </p>
          </div>

          {reviewError && (
            <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-light p-4 text-sm leading-6 text-warning">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
                <path d="M10 7v4m0 2h.01M17 10a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                {reviewError}. Điểm số vẫn được giữ lại, nhưng phần review cần dữ liệu
                chi tiết của đề.
              </span>
            </div>
          )}

          {!exam && !reviewError && (
            <div className="rounded-xl border border-border bg-surface p-5 text-sm text-text-secondary">
              Chưa có dữ liệu chi tiết để hiển thị review từng câu.
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse items-start gap-6 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-4">
              {exam?.questions.map((question, index) => {
              const selectedOptionIndex = resultSession.answers[question.id];
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
                  key={question.id}
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
                      <div
                        className={`rounded-lg border p-3 sm:p-4 ${reviewAnswerClass[status]}`}
                      >
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
                      <div className="mt-4 sm:mt-5 rounded-lg bg-background-alt p-3 sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1.5 sm:mb-2">
                          Lời giải
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
            })}
            </div>

            {exam && (
              <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-80">
                <ResultQuestionNavigator
                  questions={exam.questions}
                  answers={resultSession.answers}
                />
              </aside>
            )}
          </div>
        </section>
      </div>

      {revealState === 'revealed' && submitResult.score >= 8.0 && <Confetti />}
    </main>
  );
}

function Confetti() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes spring-up {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-spring-up {
          animation: spring-up 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-3 w-2 opacity-0"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)],
              animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>
    </>
  );
}
