'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '../../config/api';
import { getAuthToken } from '../../lib/authStorage';
import { PersistentPracticeClient } from './PersistentPracticeClient';
import { V2QuestionCard } from '../exam-v2/ExamContentTakingClient';
import { Button, Modal } from '../ui';
import type {
  V2AnswerState, V2AnswersByQuestionId, V2PracticeGradeResponseDto,
  V2PublicPracticeQuestionDto, V2PublicPracticeTopicDto, V2RawSubmittedResponse,
} from '../exam-v2/types';

type PracticeClientProps = { topicSlug: string };

function isAnswered(question: V2PublicPracticeQuestionDto, answer: V2AnswerState | undefined): boolean {
  if (answer === undefined || answer.type !== question.type) return false;
  if (answer.type === 'single_choice') return answer.choiceId.length > 0;
  if (answer.type === 'short_answer') return answer.value.trim().length > 0;
  return question.type === 'true_false_group' && answer.type === 'true_false_group' && question.statements.every(
    (statement) => typeof answer.values[statement.id] === 'boolean',
  );
}

function buildResponses(questions: readonly V2PublicPracticeQuestionDto[], answers: V2AnswersByQuestionId): { responses: readonly V2RawSubmittedResponse[]; error: string | null } {
  const responses: V2RawSubmittedResponse[] = [];
  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined) continue;
    if (answer.type !== question.type) return { responses: [], error: `Dữ liệu câu ${question.order} không hợp lệ.` };
    if (question.type === 'true_false_group' && !isAnswered(question, answer)) return { responses: [], error: `Câu ${question.order} cần chọn đủ 4 mệnh đề hoặc để trống.` };
    if (question.type === 'short_answer' && answer.type === 'short_answer') {
      if (!answer.value.trim()) continue;
      if (/\s/.test(answer.value)) return { responses: [], error: `Câu ${question.order} không được chứa khoảng trắng.` };
    }
    if (isAnswered(question, answer)) responses.push({ questionId: question.id, ...answer });
  }
  return { responses, error: null };
}

function EphemeralPracticeClient({ topicSlug }: PracticeClientProps) {
  const [practice, setPractice] = useState<V2PublicPracticeTopicDto | null>(null);
  const [answers, setAnswers] = useState<V2AnswersByQuestionId>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<V2PracticeGradeResponseDto | null>(null);
  const submitted = result !== null;
  const answeredCount = useMemo(() => practice?.questions.filter((question) => isAnswered(question, answers[question.id])).length ?? 0, [answers, practice]);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      setLoading(true); setError(null); setPractice(null); setAnswers({}); setResult(null); setShowConfirm(false);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v2/practice/topic/${encodeURIComponent(topicSlug)}?limit=10`);
        if (!response.ok) throw new Error(response.status === 404 ? 'Không tìm thấy chuyên đề để luyện tập.' : 'Không thể tải bộ luyện tập V2.');
        const data = await response.json() as V2PublicPracticeTopicDto;
        if (!active) return;
        setPractice(data); setRemainingSeconds(Math.max(data.questions.length * 90, 5 * 60));
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải bộ luyện tập.'); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [topicSlug]);

  useEffect(() => {
    if (!practice || submitted || remainingSeconds === 0) return;
    const timer = window.setInterval(() => setRemainingSeconds((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [practice, remainingSeconds, submitted]);

  const submit = async (): Promise<void> => {
    if (!practice || submitting || submitted) return;
    const submission = buildResponses(practice.questions, answers);
    if (submission.error) { setSubmitError(submission.error); setShowConfirm(false); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/practice/grade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topicSlug: practice.topic.slug, questionRefs: practice.questions.map((question) => question.reference), responses: submission.responses }) });
      const body = await response.json().catch(() => null) as { message?: string } | V2PracticeGradeResponseDto | null;
      if (!response.ok) throw new Error(body && 'message' in body ? body.message ?? 'Không thể chấm luyện tập.' : 'Không thể chấm luyện tập.');
      setResult(body as V2PracticeGradeResponseDto); setShowConfirm(false); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : 'Không thể chấm luyện tập.'); setShowConfirm(false); }
    finally { setSubmitting(false); }
  };

  useEffect(() => { if (practice && !submitted && remainingSeconds === 0) void submit(); }, [practice, remainingSeconds, submitted]);
  const restart = (): void => { if (!practice) return; setAnswers({}); setResult(null); setSubmitError(null); setRemainingSeconds(Math.max(practice.questions.length * 90, 5 * 60)); window.scrollTo({ top: 0, behavior: 'auto' }); };
  const updateAnswer = (questionId: string, answer: V2AnswerState): void => { setAnswers((previous) => ({ ...previous, [questionId]: answer })); setSubmitError(null); };

  if (loading) return <main className="min-h-[100dvh] bg-background px-4 py-8"><div className="mx-auto h-80 max-w-5xl animate-pulse rounded-xl bg-background-alt" /></main>;
  if (error || !practice) return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><section className="max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h1 className="text-xl font-bold text-text-primary">Không thể mở luyện tập</h1><p className="mt-3 text-sm text-error">{error ?? 'Dữ liệu không hợp lệ.'}</p><Link href="/analytics" className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">Về analytics</Link></section></main>;

  const percentage = practice.questions.length === 0 ? 0 : (answeredCount / practice.questions.length) * 100;
  const resultsByQuestionId = new Map(result?.results.map((item) => [item.questionId, item]) ?? []);
  return <div className="min-h-[100dvh] bg-background text-text-primary">
    <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Xác nhận chấm bài" footer={<><Button variant="primary" onClick={() => void submit()} disabled={submitting}>{submitting ? 'Đang chấm...' : 'Chấm bài'}</Button><Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitting}>Tiếp tục làm</Button></>}><p>Bạn đã trả lời <strong>{answeredCount}/{practice.questions.length}</strong> câu. Các câu bỏ trống sẽ nhận 0 điểm.</p></Modal>
    <header className="border-b border-border bg-surface"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><div><p className="text-sm font-semibold text-primary">Luyện chuyên đề · V2</p><h1 className="mt-1 text-xl font-bold">{practice.topic.name}</h1></div><div className="text-right text-sm"><p className="font-semibold tabular-nums">{Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:{(remainingSeconds % 60).toString().padStart(2, '0')}</p><p className="text-text-secondary">Không lưu lịch sử</p></div></div></header>
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {result ? <section className="mb-6 rounded-xl border border-success-border bg-success-light p-5"><p className="text-sm font-semibold text-success">Kết quả đã được chấm trên máy chủ</p><div className="mt-3 flex flex-wrap gap-4 text-sm text-text-primary"><strong>{result.scoreUnits}/{result.maxScoreUnits} điểm đơn vị</strong><span>{result.correctCount}/{result.totalQuestions} câu đúng hoàn toàn</span><span>{result.unansweredCount} chưa làm</span></div><p className="mt-3 text-xs text-text-secondary">Practice không tạo Attempt và không trả đáp án đúng.</p><Button className="mt-4" variant="outline" onClick={restart}>Làm lại</Button></section> : <section className="mb-6 rounded-xl border border-border bg-surface p-5 shadow-card"><div className="flex justify-between text-sm font-semibold"><span>Tiến độ</span><span>{answeredCount}/{practice.questions.length} câu</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-background-alt"><div className="h-full bg-primary" style={{ width: `${percentage}%` }} /></div>{submitError ? <p className="mt-3 text-sm text-error">{submitError}</p> : null}<Button className="mt-4" variant="primary" onClick={() => setShowConfirm(true)}>Chấm bài</Button></section>}
      {practice.questions.length === 0 ? <section className="rounded-xl border border-border bg-surface p-8 text-center text-text-secondary">Chuyên đề này chưa có câu hỏi V2 đã publish.</section> : <div className="space-y-5">{practice.questions.map((question, index) => <div key={question.id}><V2QuestionCard question={question} index={index} answer={answers[question.id]} isTimeUp={submitted || remainingSeconds === 0} onAnswerChange={(answer) => updateAnswer(question.id, answer)} />{result ? <p className={`mt-2 rounded-lg border px-4 py-2 text-sm font-semibold ${resultsByQuestionId.get(question.id)?.isCorrect ? 'border-success-border bg-success-light text-success' : 'border-error-border bg-error-light text-error'}`}>{resultsByQuestionId.get(question.id)?.isCorrect ? 'Trả lời đúng' : resultsByQuestionId.get(question.id)?.response === null ? 'Chưa trả lời' : 'Chưa đúng'} · {resultsByQuestionId.get(question.id)?.awardedScoreUnits ?? 0}/{resultsByQuestionId.get(question.id)?.maxScoreUnits ?? 0} điểm đơn vị</p> : null}</div>)}</div>}
    </main>
  </div>;
}

/** Guests retain the old ephemeral flow; authenticated learners use a saved session. */
export function PracticeClient({ topicSlug }: PracticeClientProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => setAuthenticated(getAuthToken() !== null), []);
  if (authenticated === null) return <main className="min-h-[100dvh] bg-background" />;
  return authenticated ? <PersistentPracticeClient topicSlug={topicSlug} /> : <EphemeralPracticeClient topicSlug={topicSlug} />;
}
