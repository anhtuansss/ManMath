'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../config/api';
import { getAuthToken } from '../../lib/authStorage';
import {
  clearV2ExamDraft,
  readV2ExamViewMode,
  writeV2ExamDraft,
  writeV2ExamResult,
  writeV2ExamViewMode,
  readV2ExamDraft,
  type V2ExamViewMode,
} from '../../lib/examContentV2Storage';
import { ExamHeader } from '../exam/ExamHeader';
import { MathText } from '../exam/MathText';
import { QuestionImage } from '../exam/QuestionImage';
import { Button, Modal } from '../ui';
import type {
  V2AnswerState,
  V2AnswersByQuestionId,
  V2CreateAttemptResponseDto,
  V2PublicExamDto,
  V2PublicQuestionDto,
  V2RawSubmittedResponse,
} from './types';

type ExamContentTakingClientProps = {
  examId: string;
};

function ExamViewModeToggle({
  value,
  onChange,
}: {
  value: V2ExamViewMode;
  onChange: (viewMode: V2ExamViewMode) => void;
}) {
  const options: ReadonlyArray<{ readonly value: V2ExamViewMode; readonly label: string }> = [
    { value: 'all', label: 'Tất cả câu' },
    { value: 'single', label: 'Từng câu' },
  ];

  return <div className="inline-flex rounded-md border border-border bg-background-alt p-0.5" role="group" aria-label="Chế độ hiển thị câu hỏi">
    {options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`h-8 rounded px-2.5 text-xs font-semibold transition-colors ${value === option.value ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{option.label}</button>)}
  </div>;
}

function CompactExamViewModeControl({
  value,
  onChange,
}: {
  value: V2ExamViewMode;
  onChange: (viewMode: V2ExamViewMode) => void;
}) {
  return <div className="mt-4 border-t border-border pt-4">
    <p className="mb-2 text-xs font-medium text-text-secondary">Chế độ làm bài</p>
    <ExamViewModeToggle value={value} onChange={onChange} />
  </div>;
}

function QuestionPager({
  currentQuestionIndex,
  questionCount,
  onPrevious,
  onNext,
}: {
  currentQuestionIndex: number;
  questionCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return <nav className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-card" aria-label="Điều hướng câu hỏi">
    <Button variant="outline" onClick={onPrevious} disabled={currentQuestionIndex === 0}>Câu trước</Button>
    <p className="text-sm font-semibold tabular-nums text-text-primary">Câu {currentQuestionIndex + 1} / {questionCount}</p>
    <Button variant="outline" onClick={onNext} disabled={currentQuestionIndex === questionCount - 1}>Câu tiếp theo</Button>
  </nav>;
}

const isAnswered = (
  question: V2PublicQuestionDto,
  answer: V2AnswerState | undefined,
): boolean => {
  if (answer === undefined) return false;

  if (question.type === 'single_choice') {
    return answer.type === 'single_choice' && answer.choiceId.length > 0;
  }

  if (question.type === 'short_answer') {
    return answer.type === 'short_answer' && answer.value.length > 0;
  }

  return answer.type === 'true_false_group' && question.statements.every(
    (statement) => typeof answer.values[statement.id] === 'boolean',
  );
};

function getQuestionClosestToViewport(questionIds: readonly string[]): string | null {
  const viewportFocus = window.innerHeight * 0.35;
  let closestQuestionId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const questionId of questionIds) {
    const element = document.getElementById(`v2-question-${questionId}`);
    if (element === null) continue;

    const bounds = element.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) continue;

    const distance = viewportFocus < bounds.top
      ? bounds.top - viewportFocus
      : viewportFocus > bounds.bottom
        ? viewportFocus - bounds.bottom
        : 0;

    if (distance < closestDistance) {
      closestQuestionId = questionId;
      closestDistance = distance;
    }
  }

  return closestQuestionId;
}

function scrollToQuestion(questionId: string, focus = false, animate = true): void {
  const questionElement = document.getElementById(`v2-question-${questionId}`);
  if (questionElement === null) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  questionElement.scrollIntoView({
    // `auto` would inherit html { scroll-behavior: smooth }; navigator jumps
    // must update immediately instead of stepping through intermediate cards.
    behavior: (animate && !reducedMotion ? 'smooth' : 'instant') as ScrollBehavior,
    block: 'start',
  });
  if (focus) questionElement.focus({ preventScroll: true });
}

function buildSubmission(
  questions: readonly V2PublicQuestionDto[],
  answers: V2AnswersByQuestionId,
): { responses: readonly V2RawSubmittedResponse[]; error: string | null } {
  const responses: V2RawSubmittedResponse[] = [];

  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined) continue;

    if (answer.type !== question.type) {
      return { responses: [], error: `Dữ liệu trả lời của câu ${question.order} không hợp lệ.` };
    }

    if (question.type === 'true_false_group' && !isAnswered(question, answer)) {
      return {
        responses: [],
        error: `Câu ${question.order} mới trả lời một phần. Hãy chọn đủ 4 mệnh đề hoặc bỏ trống cả câu.`,
      };
    }

    if (question.type === 'short_answer' && answer.type === 'short_answer') {
      if (answer.value.length === 0) continue;
      if (answer.value.trim().length === 0 || /\s/.test(answer.value)) {
        return {
          responses: [],
          error: `Câu ${question.order} không được chứa khoảng trắng.`,
        };
      }
    }

    if (!isAnswered(question, answer)) continue;
    responses.push({ questionId: question.id, ...answer });
  }

  return { responses, error: null };
}

export function V2QuestionCard({
  question,
  index,
  answer,
  isTimeUp,
  onAnswerChange,
}: {
  question: V2PublicQuestionDto;
  index: number;
  answer: V2AnswerState | undefined;
  isTimeUp: boolean;
  onAnswerChange: (answer: V2AnswerState) => void;
}) {
  const disabled = isTimeUp;
  const answered = isAnswered(question, answer);

  return (
    <article
      id={`v2-question-${question.id}`}
      tabIndex={-1}
      className="scroll-mt-28 rounded-xl border border-border bg-surface shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary">
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">Câu {index + 1}</p>
            <p className="mt-0.5 text-xs font-medium text-text-secondary">Phần {question.section}</p>
          </div>
        </div>
        {answered ? <span className="rounded-full border border-success-border bg-success-light px-2.5 py-1 text-xs font-semibold text-success">Đã trả lời</span> : null}
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <MathText as="p" text={question.content} className="max-w-3xl text-base leading-8 text-text-primary sm:text-lg sm:leading-9" />
        {question.assets?.map((asset) => <QuestionImage key={asset.src} imageUrl={asset.src} alt={asset.alt} className="mt-5" />)}

        {question.type === 'single_choice' ? (
          <div className="mt-7 space-y-3" role="radiogroup" aria-label={`Đáp án câu ${index + 1}`}>
            {question.choices.map((choice, choiceIndex) => {
              const selected = answer?.type === 'single_choice' && answer.choiceId === choice.id;
              return <button key={choice.id} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onAnswerChange({ type: 'single_choice', choiceId: choice.id })} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'border-primary bg-primary-light/40' : 'border-border bg-background hover:border-primary-hover'}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${selected ? 'border-primary bg-primary text-white' : 'border-border text-text-secondary'}`}>{String.fromCharCode(65 + choiceIndex)}</span>
                <span className="min-w-0 flex-1"><MathText as="span" text={choice.content} className="text-sm leading-6 text-text-primary" />{choice.assets?.map((asset) => <QuestionImage key={asset.src} imageUrl={asset.src} alt={asset.alt} className="mt-3" />)}</span>
              </button>;
            })}
          </div>
        ) : null}

        {question.type === 'true_false_group' ? (
          <div className="mt-7">
            <p className="mb-3 text-sm text-text-secondary">Chọn Đúng hoặc Sai cho từng mệnh đề.</p>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead className="bg-background-alt text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th scope="col" className="px-4 py-3">Phát biểu</th>
                      <th scope="col" className="w-28 border-l border-border px-3 py-3 text-center">Đúng</th>
                      <th scope="col" className="w-28 border-l border-border px-3 py-3 text-center">Sai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {question.statements.map((statement, statementIndex) => {
                      const selectedValue = answer?.type === 'true_false_group'
                        ? answer.values[statement.id]
                        : undefined;
                      const values = answer?.type === 'true_false_group' ? answer.values : {};
                      const cellButtonClass = (value: boolean): string => selectedValue === value
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-text-primary hover:border-primary hover:bg-primary-light/40';
                      return <tr key={statement.id} className="bg-surface align-top">
                        <td className="px-4 py-4"><div className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">{String.fromCharCode(97 + statementIndex)}</span><MathText as="div" text={statement.content} className="min-w-0 text-sm leading-6 text-text-primary" /></div></td>
                        <td className="border-l border-border px-3 py-4 text-center"><button type="button" aria-label={`Mệnh đề ${String.fromCharCode(97 + statementIndex)}: Đúng`} aria-pressed={selectedValue === true} disabled={disabled} onClick={() => onAnswerChange({ type: 'true_false_group', values: { ...values, [statement.id]: true } })} className={`inline-flex h-9 min-w-16 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cellButtonClass(true)}`}>Đúng</button></td>
                        <td className="border-l border-border px-3 py-4 text-center"><button type="button" aria-label={`Mệnh đề ${String.fromCharCode(97 + statementIndex)}: Sai`} aria-pressed={selectedValue === false} disabled={disabled} onClick={() => onAnswerChange({ type: 'true_false_group', values: { ...values, [statement.id]: false } })} className={`inline-flex h-9 min-w-16 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cellButtonClass(false)}`}>Sai</button></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {question.type === 'short_answer' ? (
          <div className="mt-7 max-w-xs"><label htmlFor={`short-answer-${question.id}`} className="text-sm font-semibold text-text-primary">Câu trả lời</label><input id={`short-answer-${question.id}`} type="text" inputMode="decimal" maxLength={4} value={answer?.type === 'short_answer' ? answer.value : ''} disabled={disabled} onChange={(event) => onAnswerChange({ type: 'short_answer', value: event.target.value })} className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary-light disabled:cursor-not-allowed disabled:opacity-60" /><p className="mt-2 text-xs leading-5 text-text-secondary">Tối đa 4 ký tự: số, dấu âm (-) và dấu phẩy (,).</p></div>
        ) : null}
      </div>
    </article>
  );
}

export function ExamContentTakingClient({ examId }: ExamContentTakingClientProps) {
  const router = useRouter();
  const [exam, setExam] = useState<V2PublicExamDto | null>(null);
  const [answers, setAnswers] = useState<V2AnswersByQuestionId>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<V2ExamViewMode>('all');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const pendingAllModeScrollQuestionId = useRef<string | null>(null);
  const isTimeUp = remainingSeconds === 0;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setIsReady(false);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v2/exams/${examId}`);
        if (!response.ok) throw new Error(response.status === 404 ? 'Không tìm thấy đề thi V2.' : 'Không thể tải đề thi V2.');
        const data = await response.json() as V2PublicExamDto;
        if (!active) return;
        const draft = readV2ExamDraft(localStorage, examId, data.examVersionId);
        setExam(data);
        setAnswers(draft?.answers ?? {});
        setRemainingSeconds(draft?.remainingSeconds ?? data.durationMinutes * 60);
        setCurrentQuestionId(data.questions[0]?.id ?? null);
        setViewMode(readV2ExamViewMode(localStorage, examId, data.examVersionId));
        setIsReady(true);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không thể tải đề thi V2.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [examId]);

  useEffect(() => {
    if (!exam || !isReady) return;
    writeV2ExamDraft(localStorage, examId, exam.examVersionId, { version: 2, examVersionId: exam.examVersionId, answers, remainingSeconds, updatedAt: Date.now() });
  }, [answers, exam, examId, isReady, remainingSeconds]);

  useEffect(() => {
    if (!exam || !isReady) return;
    writeV2ExamViewMode(localStorage, examId, exam.examVersionId, viewMode);
  }, [exam, examId, isReady, viewMode]);

  useEffect(() => {
    if (!isReady || remainingSeconds === 0) return;
    const timer = window.setInterval(() => setRemainingSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [isReady, remainingSeconds]);

  useEffect(() => {
    if (viewMode !== 'single' || currentQuestionId === null) return;
    scrollToQuestion(currentQuestionId, true);
  }, [currentQuestionId, viewMode]);

  useEffect(() => {
    if (viewMode !== 'all' || exam === null) return;

    let animationFrame: number | null = null;
    const syncCurrentQuestionFromViewport = (): void => {
      if (pendingAllModeScrollQuestionId.current !== null) return;
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        const visibleQuestionId = getQuestionClosestToViewport(exam.questions.map((question) => question.id));
        if (visibleQuestionId !== null) setCurrentQuestionId(visibleQuestionId);
      });
    };

    syncCurrentQuestionFromViewport();
    window.addEventListener('scroll', syncCurrentQuestionFromViewport, { passive: true });
    window.addEventListener('resize', syncCurrentQuestionFromViewport);
    return () => {
      window.removeEventListener('scroll', syncCurrentQuestionFromViewport);
      window.removeEventListener('resize', syncCurrentQuestionFromViewport);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [exam, viewMode]);

  useEffect(() => {
    if (viewMode !== 'all') return;
    const questionId = pendingAllModeScrollQuestionId.current;
    if (questionId === null) return;

    pendingAllModeScrollQuestionId.current = null;
    const animationFrame = window.requestAnimationFrame(() => scrollToQuestion(questionId, true, false));
    return () => window.cancelAnimationFrame(animationFrame);
  }, [viewMode]);

  const answeredCount = useMemo(() => exam?.questions.filter((question) => isAnswered(question, answers[question.id])).length ?? 0, [answers, exam]);

  const updateAnswer = (questionId: string, nextAnswer: V2AnswerState): void => {
    setCurrentQuestionId(questionId);
    setAnswers((previous) => ({ ...previous, [questionId]: nextAnswer }));
    setSubmitError(null);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!exam) return;
    const submission = buildSubmission(exam.questions, answers);
    if (submission.error) {
      setSubmitError(submission.error);
      setShowSubmitConfirm(false);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${API_BASE_URL}/api/v2/exams/${examId}/attempts`, {
        method: 'POST', headers,
        body: JSON.stringify({ examVersionId: exam.examVersionId, responses: submission.responses, durationSeconds: Math.max(exam.durationMinutes * 60 - remainingSeconds, 0) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? 'Không thể nộp bài V2.');
      }
      const result = await response.json() as V2CreateAttemptResponseDto;
      writeV2ExamResult(sessionStorage, examId, { version: 1, examId, examTitle: exam.title, wasAuthenticated: token !== null, result });
      clearV2ExamDraft(localStorage, examId, exam.examVersionId);
      router.push(`/exam-v2/${examId}/result?attemptId=${encodeURIComponent(result.attemptId)}`);
    } catch (submissionError) {
      setSubmitError(submissionError instanceof Error ? submissionError.message : 'Không thể nộp bài V2.');
    } finally {
      setIsSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const navigate = (questionId: string): void => {
    setCurrentQuestionId(questionId);
    if (viewMode === 'all') {
      scrollToQuestion(questionId, false, false);
    }
  };

  const changeViewMode = (nextViewMode: V2ExamViewMode): void => {
    if (nextViewMode === viewMode) return;

    if (nextViewMode === 'single' && viewMode === 'all' && exam !== null) {
      const visibleQuestionId = getQuestionClosestToViewport(exam.questions.map((question) => question.id));
      if (visibleQuestionId !== null) setCurrentQuestionId(visibleQuestionId);
    }

    if (nextViewMode === 'all' && currentQuestionId !== null) {
      pendingAllModeScrollQuestionId.current = currentQuestionId;
    }

    setViewMode(nextViewMode);
  };

  if (loading) return <main className="min-h-[100dvh] bg-background px-4 py-8 text-text-primary"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-16 rounded-xl bg-background-alt" /><div className="h-80 rounded-xl border border-border bg-surface" /></div></main>;
  if (error || !exam) return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><section className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h1 className="text-xl font-bold text-text-primary">Không thể mở đề V2</h1><p className="mt-3 text-sm text-error">{error ?? 'Dữ liệu đề không hợp lệ.'}</p><Link href="/dashboard" className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white">Về kho đề</Link></section></main>;

  const currentQuestionIndex = Math.max(
    exam.questions.findIndex((question) => question.id === currentQuestionId),
    0,
  );
  const currentQuestion = exam.questions[currentQuestionIndex];

  return <div className="min-h-[100dvh] bg-background text-text-primary">
    <Modal isOpen={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="Xác nhận nộp bài" footer={<><Button variant="primary" onClick={() => void handleSubmit()} disabled={isSubmitting}>{isSubmitting ? 'Đang nộp...' : 'Nộp bài ngay'}</Button><Button variant="outline" onClick={() => setShowSubmitConfirm(false)} disabled={isSubmitting}>Tiếp tục làm bài</Button></>}><p>Bạn đã hoàn thành <span className="font-semibold text-text-primary">{answeredCount}/{exam.questions.length}</span> câu. Những câu chưa làm vẫn có thể nộp.</p></Modal>
    <ExamHeader examTitle={exam.title} questionCount={exam.questions.length} remainingSeconds={remainingSeconds} isTimeUp={false} onSubmit={() => setShowSubmitConfirm(true)} />
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {viewMode === 'all' ? <>
      {isTimeUp ? <p className="mb-5 rounded-lg border border-warning-border bg-warning-light px-4 py-3 text-sm text-text-secondary">Đã hết thời gian. Bạn vẫn có thể nộp bài với các câu đã trả lời.</p> : null}
      {submitError ? <p className="mb-5 rounded-lg border border-error-border bg-error-light px-4 py-3 text-sm text-error">{submitError}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start"><div className="space-y-7">{exam.questions.map((question, index) => <V2QuestionCard key={question.id} question={question} index={index} answer={answers[question.id]} isTimeUp={isTimeUp} onAnswerChange={(nextAnswer) => updateAnswer(question.id, nextAnswer)} />)}</div><aside className="lg:sticky lg:top-24"><div className="rounded-xl border border-border bg-surface p-5 shadow-card"><h2 className="text-sm font-semibold text-text-primary">Câu hỏi</h2><p className="mt-1 text-xs text-text-secondary">Đã trả lời {answeredCount}/{exam.questions.length}</p><div className="mt-4 grid grid-cols-5 gap-2">{exam.questions.map((question, index) => { const answered = isAnswered(question, answers[question.id]); const current = currentQuestionId === question.id; return <button key={question.id} type="button" aria-current={current ? 'true' : undefined} onClick={() => navigate(question.id)} className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold ${current ? 'border-primary bg-primary text-white' : answered ? 'border-success-border bg-success-light text-success' : 'border-border bg-surface text-text-secondary hover:border-primary'}`}>{index + 1}</button>; })}</div><CompactExamViewModeControl value={viewMode} onChange={changeViewMode} /></div></aside></div>
      </> : <>
        {isTimeUp ? <p className="mb-5 rounded-lg border border-warning-border bg-warning-light px-4 py-3 text-sm text-text-secondary">Đã hết thời gian. Bạn vẫn có thể nộp bài với các câu đã trả lời.</p> : null}
        {submitError ? <p className="mb-5 rounded-lg border border-error-border bg-error-light px-4 py-3 text-sm text-error">{submitError}</p> : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="space-y-5">
            {currentQuestion ? <>
              <V2QuestionCard question={currentQuestion} index={currentQuestionIndex} answer={answers[currentQuestion.id]} isTimeUp={isTimeUp} onAnswerChange={(nextAnswer) => updateAnswer(currentQuestion.id, nextAnswer)} />
              <QuestionPager currentQuestionIndex={currentQuestionIndex} questionCount={exam.questions.length} onPrevious={() => navigate(exam.questions[currentQuestionIndex - 1]!.id)} onNext={() => navigate(exam.questions[currentQuestionIndex + 1]!.id)} />
            </> : null}
          </div>
          <aside className="lg:sticky lg:top-24"><div className="rounded-xl border border-border bg-surface p-5 shadow-card"><h2 className="text-sm font-semibold text-text-primary">Câu hỏi</h2><p className="mt-1 text-xs text-text-secondary">Đã trả lời {answeredCount}/{exam.questions.length}</p><div className="mt-4 grid grid-cols-5 gap-2">{exam.questions.map((question, index) => { const answered = isAnswered(question, answers[question.id]); const current = currentQuestionId === question.id; return <button key={question.id} type="button" aria-current={current ? 'true' : undefined} onClick={() => navigate(question.id)} className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold ${current ? 'border-primary bg-primary text-white' : answered ? 'border-success-border bg-success-light text-success' : 'border-border bg-surface text-text-secondary hover:border-primary'}`}>{index + 1}</button>; })}</div><CompactExamViewModeControl value={viewMode} onChange={changeViewMode} /></div></aside>
        </div>
      </>}
    </main>
  </div>;
}
