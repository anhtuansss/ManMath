'use client';

/**
 * Mục đích:
 * Component chạy phía trình duyệt chính của màn làm bài. Quản lý tải chi tiết đề,
 * đồng hồ, đáp án người dùng, lưu nháp, điều hướng câu hỏi trong thanh bên và nộp bài.
 *
 * Luồng dữ liệu:
 * GET /api/exams/:id -> hiển thị câu hỏi.
 * localStorage -> khôi phục/lưu nháp đáp án và thời gian theo từng đề.
 * POST /api/exam/submit -> sessionStorage -> chuyển sang /exam/[id]/result.
 *
 * frontend/src/lib/storage.ts
 * backend/server.ts
 */
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExamHeader } from './ExamHeader';
import { ExamSidebar } from './ExamSidebar';
import { QuestionList } from './QuestionList';
import { API_BASE_URL } from '../../config/api';
import { getAuthToken } from '../../lib/authStorage';
import {
  clearDraftStorage,
  getExamResultKey,
  readDraftStorage,
  writeDraftStorage,
  writeJsonStorage,
} from '../../lib/storage';
import { Button, Modal } from '../ui';

import type {
  Answers,
  ExamDetailDto,
  ExamDraftSession,
  ExamResultSession,
  SubmitExamRequestDto,
  SubmitExamResultDto,
} from './types';

type ExamTakingClientProps = {
  examId: string;
};

export function ExamTakingClient({ examId }: ExamTakingClientProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const [exam, setExam] = useState<ExamDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  
  // Autosave UX states
  const [draftSession, setDraftSession] = useState<ExamDraftSession | null>(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isDraftResolved, setIsDraftResolved] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const isTimeUp = remainingSeconds === 0;
  const router = useRouter();

  // Use a ref to access the latest answers inside the setInterval without triggering re-renders
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  /**
   * Tải chi tiết đề từ backend và reset state của màn làm bài theo examId hiện tại.
   */
  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        setError(null);
        setExam(null);
        setRemainingSeconds(0);
        setCurrentQuestionId(null);
        setIsDraftResolved(false);

        const response = await fetch(`${API_BASE_URL}/api/exams/${examId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Không tìm thấy đề thi');
          }

          throw new Error('Không tải được đề thi');
        }

        const data: ExamDetailDto = await response.json();
        setExam(data);

        // Check for existing draft
        const draft = readDraftStorage(localStorage, examId);
        if (draft) {
          setDraftSession(draft);
          setShowDraftPrompt(true);
        } else {
          setRemainingSeconds(data.durationMinutes * 60);
          setIsDraftResolved(true);
        }
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Lỗi không xác định khi tải đề thi',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  const handleContinueDraft = () => {
    if (!draftSession || !exam) return;
    setAnswers(draftSession.answers);
    const secs = draftSession.remainingSeconds;
    // Handle old format where remainingSeconds was -1, or if timer ran out
    setRemainingSeconds(secs > 0 ? secs : exam.durationMinutes * 60);
    setShowDraftPrompt(false);
    setIsDraftResolved(true);
  };

  const handleStartFresh = () => {
    if (!exam) return;
    clearDraftStorage(localStorage, examId);
    setAnswers({});
    setRemainingSeconds(exam.durationMinutes * 60);
    setShowDraftPrompt(false);
    setIsDraftResolved(true);
  };

  // Đồng hồ chạy ở client; khi về 0, các nút đáp án sẽ bị khóa.
  useEffect(() => {
    if (!exam || !isDraftResolved) return;

    const timerId = window.setInterval(() => {
      setRemainingSeconds((previousSeconds) => {
        if (previousSeconds <= 1) {
          window.clearInterval(timerId);
          return 0;
        }

        const nextSeconds = previousSeconds - 1;
        
        // Autosave timer and current answers
        writeDraftStorage(localStorage, examId, {
          answers: answersRef.current,
          remainingSeconds: nextSeconds,
          updatedAt: Date.now()
        });

        return nextSeconds;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [exam, isDraftResolved, examId]);

  /**
   * Đồng bộ currentQuestionId với vị trí cuộn để thanh bên làm nổi bật
   * câu hỏi đang nằm gần sticky header.
   */
  useEffect(() => {
    if (!exam?.questions.length) return;

    const syncCurrentQuestion = () => {
      const stickyHeaderOffset = 120;
      let nextQuestionId = exam.questions[0].id;

      for (const question of exam.questions) {
        const element = document.getElementById(`question-${question.id}`);

        if (!element) continue;

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
  }, [exam]);

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    const newAnswers = {
      ...answers,
      [questionId]: optionIndex,
    };

    setAnswers(newAnswers);
    // Lưu ngay mỗi lần chọn đáp án để reload không làm mất tiến độ.
    writeDraftStorage(localStorage, examId, {
      answers: newAnswers,
      remainingSeconds,
      updatedAt: Date.now()
    });
  };

  /**
   * Xác nhận nộp bài
   */
  const confirmSubmit = () => {
    setShowSubmitConfirm(true);
  };

  /**
   * Nộp đáp án lên backend, lưu kết quả tạm vào sessionStorage,
   * xóa lưu nháp localStorage, rồi chuyển người dùng sang trang kết quả.
   */
  const handleSubmit = async () => {
    if (!exam) return;

    try {
      const totalDurationSeconds = exam.durationMinutes * 60;
      const durationSeconds = Math.max(totalDurationSeconds - remainingSeconds, 0);

      const payload: SubmitExamRequestDto = {
        examId: exam.id,
        answers,
        durationSeconds,
      };

      const authToken = getAuthToken();
      const requestHeaders: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        requestHeaders.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/exam/submit`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit exam');
      }

      const result: SubmitExamResultDto = await response.json();

      const resultSession: ExamResultSession = {
        examId: exam.id,
        examTitle: exam.examTitle,
        submittedAt: new Date().toISOString(),
        answers,
        submitResult: result,
        exam,
      };

      // Xóa nháp khi nộp bài thành công
      clearDraftStorage(localStorage, examId);

      writeJsonStorage(sessionStorage, getExamResultKey(examId), resultSession);
      router.push(`/exam/${examId}/result`);
    } catch (submitError) {
      console.error('Submit error:', submitError);
    }
  };

  const handleQuestionNavigate = (questionId: number) => {
    setCurrentQuestionId(questionId);
    document
      .getElementById(`question-${questionId}`)
      ?.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  useEffect(() => {
    if (!exam || showSubmitConfirm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const currentIndex = exam.questions.findIndex((q) => q.id === currentQuestionId);
      
      if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          e.preventDefault();
          handleQuestionNavigate(exam.questions[currentIndex - 1].id);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < exam.questions.length - 1 && currentIndex !== -1) {
          e.preventDefault();
          handleQuestionNavigate(exam.questions[currentIndex + 1].id);
        }
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        if (currentQuestionId !== null) {
          e.preventDefault();
          const optionIndex = parseInt(e.key, 10) - 1;
          handleSelectAnswer(currentQuestionId, optionIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exam, currentQuestionId, answers, remainingSeconds, showSubmitConfirm]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background text-text-primary">
        <div className="border-b border-border bg-surface shadow-header">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-primary-light" />
              <div className="border-l border-border pl-4">
                <div className="h-3 w-20 animate-pulse rounded bg-background-alt" />
                <div className="mt-2 h-4 w-40 animate-pulse rounded bg-background-alt" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-24 animate-pulse rounded-lg bg-background-alt" />
              <div className="h-10 w-24 animate-pulse rounded-lg bg-primary-light" />
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              <div className="h-16 animate-pulse rounded-xl border border-border bg-surface shadow-card" />
              <div className="animate-pulse rounded-xl border border-border bg-surface shadow-card">
                <div className="border-b border-border px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary-light" />
                    <div className="h-4 w-24 rounded bg-background-alt" />
                  </div>
                </div>
                <div className="px-5 py-6">
                  <div className="h-4 w-full rounded bg-background-alt" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-background-alt" />
                  <div className="mt-6 space-y-3">
                    <div className="h-14 rounded-xl border border-border bg-background" />
                    <div className="h-14 rounded-xl border border-border bg-background" />
                    <div className="h-14 rounded-xl border border-border bg-background" />
                    <div className="h-14 rounded-xl border border-border bg-background" />
                  </div>
                </div>
              </div>
              <div className="h-72 animate-pulse rounded-xl border border-border bg-surface shadow-card" />
            </div>
            <div className="animate-pulse rounded-xl border border-border bg-surface shadow-card">
              <div className="p-5">
                <div className="h-4 w-16 rounded bg-background-alt" />
                <div className="mt-1 h-3 w-32 rounded bg-background-alt" />
                <div className="mt-4 rounded-lg border border-border bg-background p-3">
                  <div className="h-3 w-full rounded bg-background-alt" />
                  <div className="mt-2 h-1.5 rounded-full bg-background-alt" />
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-9 w-9 rounded-lg border border-border bg-background"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 text-text-primary">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card animate-fade-in">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-error-light">
            <svg
              width="24"
              height="24"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="text-error"
            >
              <path
                d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm0 7a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM8 4.5a.75.75 0 0 1 .743.648L8.75 5.25v3.5a.75.75 0 0 1-1.493.102L7.25 8.75v-3.5A.75.75 0 0 1 8 4.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="mt-4 font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
            Không thể mở đề thi
          </h1>
          <p className="mt-2 text-sm leading-6 text-error">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Quay về danh sách đề
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-text-primary">
      <Modal
        isOpen={showDraftPrompt}
        onClose={() => setShowDraftPrompt(false)}
        title="Bạn có bài làm chưa hoàn thành"
        icon={
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M8 2.5v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        }
        footer={
          <>
            <Button onClick={handleContinueDraft} variant="primary">
              Tiếp tục làm bài
            </Button>
            <Button onClick={handleStartFresh} variant="outline">
              Làm lại từ đầu
            </Button>
          </>
        }
      >
        <p>ManMath đã lưu tạm đáp án và thời gian còn lại của lần làm trước.</p>
      </Modal>

      {exam && (
        <Modal
          isOpen={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          title="Xác nhận nộp bài"
          icon={
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M13.354 2.646a.5.5 0 0 1 .058.638l-.058.07L6.707 10l-3-3a.5.5 0 0 1 .638-.765l.07.058L7 8.586l6.293-6.293a.5.5 0 0 1 .708 0l-.647.353Z" fill="currentColor"/>
              <path d="M14.5 8a.5.5 0 0 1 .492.41L15 8.5V12a3 3 0 0 1-2.824 2.995L12 15H4a3 3 0 0 1-2.995-2.824L1 12V4a3 3 0 0 1 2.824-2.995L4 1h5.5a.5.5 0 0 1 .09.992L9.5 2H4a2 2 0 0 0-1.995 1.85L2 4v8a2 2 0 0 0 1.85 1.995L4 14h8a2 2 0 0 0 1.995-1.85L14 12V8.5a.5.5 0 0 1 .5-.5Z" fill="currentColor"/>
            </svg>
          }
          footer={
            <>
              <Button onClick={handleSubmit} variant="primary">
                Nộp bài ngay
              </Button>
              <Button onClick={() => setShowSubmitConfirm(false)} variant="outline">
                Tiếp tục làm bài
              </Button>
            </>
          }
        >
          <p>
            Bạn đã hoàn thành <span className="font-semibold text-text-primary">{Object.keys(answers).length}/{exam.questions.length}</span> câu. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
          </p>
        </Modal>
      )}

      <ExamHeader
        examTitle={exam?.examTitle}
        questionCount={exam?.questions.length ?? 0}
        remainingSeconds={remainingSeconds}
        isTimeUp={isTimeUp}
        onSubmit={confirmSubmit}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <QuestionList
            questions={exam?.questions}
            answers={answers}
            isTimeUp={isTimeUp}
            onSelectAnswer={handleSelectAnswer}
          />
          <ExamSidebar
            questions={exam?.questions}
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
