'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import { getAuthToken } from '../../lib/authStorage';
import { V2QuestionCard } from './ExamContentTakingClient';
import type { V2PublicExamDto } from './types';

type ExamContentDraftPreviewClientProps = {
  readonly examId: string;
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json() as { message?: unknown };
    return typeof body.message === 'string' ? body.message : 'Không thể tải bản nháp đề thi V2.';
  } catch {
    return 'Không thể tải bản nháp đề thi V2.';
  }
};

export function ExamContentDraftPreviewClient({
  examId,
}: ExamContentDraftPreviewClientProps) {
  const [exam, setExam] = useState<V2PublicExamDto | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (token === null) {
        if (active) {
          setError('Bạn cần đăng nhập bằng tài khoản được cấp quyền để xem bản nháp.');
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v2/internal/exam-previews/${encodeURIComponent(examId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
          }
          if (response.status === 403) {
            throw new Error('Tài khoản này không có quyền xem bản nháp.');
          }
          if (response.status === 404) {
            throw new Error('Không tìm thấy bản nháp cho đề thi này.');
          }
          throw new Error(await readErrorMessage(response));
        }

        const data = await response.json() as V2PublicExamDto;
        if (!active) return;
        setExam(data);
        setCurrentQuestionId(data.questions[0]?.id ?? null);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Không thể tải bản nháp đề thi V2.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [examId]);

  const navigate = (questionId: string): void => {
    setCurrentQuestionId(questionId);
    document.getElementById(`v2-question-${questionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (loading) {
    return <main className="min-h-[100dvh] bg-background px-4 py-8 text-text-primary"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-16 rounded-xl bg-background-alt" /><div className="h-80 rounded-xl border border-border bg-surface" /></div></main>;
  }

  if (error || exam === null) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><section className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card"><p className="text-xs font-bold tracking-[0.16em] text-warning">DRAFT PREVIEW</p><h1 className="mt-2 text-xl font-bold text-text-primary">Không thể mở bản nháp</h1><p className="mt-3 text-sm text-error">{error ?? 'Dữ liệu đề không hợp lệ.'}</p><Link href="/dashboard" className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white">Về kho đề</Link></section></main>;
  }

  return <div className="min-h-[100dvh] bg-background text-text-primary">
    <header className="sticky top-0 z-50 border-b border-warning-border bg-warning-light/95 shadow-header backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0"><p className="text-xs font-bold tracking-[0.16em] text-warning">DRAFT PREVIEW</p><h1 className="mt-1 truncate text-sm font-semibold text-text-primary sm:text-base">{exam.title}</h1></div>
        <p className="text-xs font-medium text-text-secondary">Chỉ xem trước — không lưu đáp án, không thể nộp bài.</p>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-xl border border-warning-border bg-warning-light px-5 py-4 text-sm text-text-primary"><p className="font-semibold">Bản nháp nội bộ</p><p className="mt-1 leading-6 text-text-secondary">Kiểm tra hiển thị, KaTeX, hình ảnh và thứ tự câu hỏi trước khi publish. Các lựa chọn đã bị khóa; không có timer, submit, autosave hoặc dữ liệu attempt.</p></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start"><div className="space-y-7">{exam.questions.map((question, index) => <V2QuestionCard key={question.id} question={question} index={index} answer={undefined} isTimeUp onAnswerChange={() => {}} />)}</div><aside className="lg:sticky lg:top-24"><div className="rounded-xl border border-border bg-surface p-5 shadow-card"><h2 className="text-sm font-semibold text-text-primary">Câu hỏi</h2><p className="mt-1 text-xs text-text-secondary">{exam.questions.length} câu · chỉ xem</p><div className="mt-4 grid grid-cols-5 gap-2">{exam.questions.map((question, index) => { const current = currentQuestionId === question.id; return <button key={question.id} type="button" aria-current={current ? 'true' : undefined} onClick={() => navigate(question.id)} className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold ${current ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-secondary hover:border-primary'}`}>{index + 1}</button>; })}</div></div></aside></div>
    </main>
  </div>;
}
