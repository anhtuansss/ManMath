'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchProtectedJson, getCurrentUser } from '../../lib/authApi';
import type { LearningOverviewResponse } from '../../lib/apiTypes';

const href = (topic: string, subtopic: string) => `/practice/topic/${topic}?subtopic=${subtopic}`;
const label = (value: string) => value === 'insufficient_data' ? 'Chưa đủ dữ liệu' : value === 'developing' ? 'Đang phát triển' : value === 'proficient' ? 'Thành thạo' : 'Vững vàng';

export function AnalyticsClient() {
  const [data, setData] = useState<LearningOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { try { if (!await getCurrentUser()) { setError('Bạn cần đăng nhập để xem phân tích.'); return; } setData(await fetchProtectedJson<LearningOverviewResponse>('/api/me/learning-overview')); } catch { setError('Không tải được phân tích học tập.'); } })(); }, []);
  if (error) return <main className="p-8"><p className="text-error">{error}</p></main>;
  if (!data) return <main className="p-8">Đang tải phân tích…</main>;
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6"><header><p className="workspace-eyebrow">Phân tích học tập</p><h1 className="workspace-page-title mt-1">Mastery theo chuyên đề</h1><p className="workspace-page-description mt-2">Mastery dùng score units; số câu đã trả lời thể hiện độ tin cậy của kết luận.</p></header>
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card"><h2 className="workspace-section-title">Tổng quan</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><p><strong>{data.overall.masteryPercent ?? '—'}%</strong><br /><span className="workspace-metadata">mastery</span></p><p><strong>{data.overall.answeredCount}</strong><br /><span className="workspace-metadata">câu đã trả lời</span></p><p><strong>{data.overall.examQuestionCount}/{data.overall.practiceQuestionCount}</strong><br /><span className="workspace-metadata">đề / luyện tập</span></p></div></section>
    <section className="rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border p-5"><h2 className="workspace-section-title">Chi tiết subtopic</h2></div><div className="divide-y divide-border">{data.subtopics.filter((item) => item.answeredCount > 0 || item.corpusStatus === 'available').map((item) => <article className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_100px_120px_140px] md:items-center" key={item.subtopicSlug}><div><strong>{item.subtopicName}</strong><p className="workspace-metadata mt-1">{item.topicName} · {item.answeredCount} câu đã trả lời · {item.fullyCorrectCount} đúng hoàn toàn · đề {item.examQuestionCount}, luyện tập {item.practiceQuestionCount}</p></div><strong>{item.masteryPercent === null ? '—' : `${item.masteryPercent}%`}</strong><span className="workspace-badge-text">{label(item.status)}</span><div>{item.corpusStatus === 'insufficient' ? <span className="workspace-metadata">Kho câu chưa đủ 5</span> : <Link className="workspace-button-text text-primary" href={href(item.topicSlug, item.subtopicSlug!)}>Luyện tập</Link>}</div></article>)}</div></section>
  </main>;
}
