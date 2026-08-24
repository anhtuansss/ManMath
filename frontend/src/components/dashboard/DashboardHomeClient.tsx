'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import { getExamTakingHref } from '../../lib/examRoutes';
import { ExamCard } from '../exam/ExamCard';
import { RecommendationCard } from '../exam/RecommendationCard';
import type { ExamListApiItem, ExamListItem } from '../exam/types';

const toItem = (exam: ExamListApiItem): ExamListItem => ({ ...exam, href: getExamTakingHref(exam.id) });

export function DashboardHomeClient() {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${API_BASE_URL}/api/exams`).then(async (response) => response.ok ? response.json() as Promise<ExamListApiItem[]> : []).then((data) => setExams(data.map(toItem))).catch(() => setExams([]));
    try { for (let index = 0; index < localStorage.length; index += 1) { const key = localStorage.key(index); if (key?.startsWith('manmath:exam-draft:')) { setDraftId(key.split(':')[2] ?? null); break; } if (key?.startsWith('manmath:v2:exam-draft:v2:')) { setDraftId(key.split(':')[4] ?? null); break; } } } catch { /* Draft detection is optional. */ }
  }, []);

  const draftExam = exams.find((exam) => exam.id === draftId);
  const featuredExams = exams.slice(0, 3);
  const visibleExams = exams.slice(0, 4);

  return <main id="main-content" tabIndex={-1} className="min-h-screen bg-background pb-16 text-text-primary"><div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8"><header><p className="workspace-eyebrow">Xin chào 👋</p><h1 className="workspace-page-title mt-1 text-text-primary">Chọn đề để chinh phục hôm nay</h1><p className="workspace-page-description mt-2">Luyện tập mỗi ngày để tiến bộ vững vàng hơn.</p></header>{draftExam ? <section className="mt-6 rounded-xl border border-primary/20 bg-surface p-5 shadow-card"><p className="workspace-badge-text text-primary">TIẾP TỤC BÀI ĐANG LÀM</p><div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h2 className="workspace-item-title text-text-primary">{draftExam.title}</h2><p className="workspace-metadata mt-1">{draftExam.totalQuestions} câu · {draftExam.durationMinutes} phút</p></div><Link href={draftExam.href} className="workspace-button-text inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-white transition hover:bg-primary-hover">Tiếp tục làm bài</Link></div></section> : null}<section className="mt-9" aria-labelledby="featured-exams-title"><div><p className="workspace-eyebrow text-primary">ĐỀ LUYỆN THI ĐỀ XUẤT</p><h2 id="featured-exams-title" className="workspace-section-title mt-1 text-text-primary">Bắt đầu với một đề phù hợp</h2></div><div className="mt-5 grid gap-5 lg:grid-cols-3">{featuredExams.map((exam) => <ExamCard key={exam.id} exam={exam} variant="featured" />)}</div></section><div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start"><section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card" aria-labelledby="exam-list-title"><header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"><div><h2 id="exam-list-title" className="workspace-section-title text-text-primary">Danh sách đề thi</h2><p className="workspace-metadata mt-1">Các đề luyện hiện có trong kho đề.</p></div><span className="workspace-badge-text text-text-secondary">{visibleExams.length} đề</span></header><div className="px-5">{visibleExams.map((exam) => <ExamCard key={exam.id} exam={exam} variant="compact" />)}</div><footer className="border-t border-border px-5 py-4 text-center"><Link href="/exams" className="workspace-button-text inline-flex items-center text-primary transition hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem tất cả đề thi →</Link></footer></section><aside className="lg:sticky lg:top-24"><RecommendationCard /></aside></div></div></main>;
}
