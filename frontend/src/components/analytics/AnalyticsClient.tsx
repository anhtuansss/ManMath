'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchProtectedJson, getCurrentUser, isUnauthorizedError } from '../../lib/authApi';
import { subscribeAuthTokenChange } from '../../lib/authStorage';
import type { LearningAggregate, LearningOverviewResponse } from '../../lib/apiTypes';

type AnalyticsStatus = 'loading' | 'unauthorized' | 'ready' | 'error';

type CapabilityGroup = { key: string; label: string; description: string; topicSlugs: readonly string[] };

const CAPABILITY_GROUPS: readonly CapabilityGroup[] = [
  { key: 'functions', label: 'Hàm số', description: 'Hàm số và ứng dụng đạo hàm', topicSlugs: ['ham-so-va-do-thi-nen-tang', 'dao-ham-va-khao-sat-ham-so'] },
  { key: 'exponential-log', label: 'Mũ – Logarit', description: 'Lũy thừa, mũ và logarit', topicSlugs: ['luy-thua-mu-va-logarit'] },
  { key: 'calculus', label: 'Tích phân', description: 'Nguyên hàm, tích phân và ứng dụng', topicSlugs: ['nguyen-ham-tich-phan-va-ung-dung'] },
  { key: 'coordinate-geometry', label: 'Oxyz', description: 'Vectơ và tọa độ trong không gian Oxyz', topicSlugs: ['vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz'] },
  { key: 'geometry', label: 'Hình không gian', description: 'Hình học không gian và khối tròn xoay', topicSlugs: ['hinh-hoc-khong-gian', 'khoi-tron-xoay'] },
  { key: 'probability-statistics', label: 'Xác suất – Thống kê', description: 'Xác suất, tổ hợp và thống kê', topicSlugs: ['xac-suat-va-to-hop', 'thong-ke'] },
];

type CapabilityScore = CapabilityGroup & { earned: number; maximum: number; percent: number | null };

const aggregateCapabilities = (topics: readonly LearningAggregate[]): CapabilityScore[] => CAPABILITY_GROUPS.map((group) => {
  const matching = topics.filter((topic) => group.topicSlugs.includes(topic.topicSlug));
  const earned = matching.reduce((sum, topic) => sum + topic.earnedScoreUnits, 0);
  const maximum = matching.reduce((sum, topic) => sum + topic.maxScoreUnits, 0);
  return { ...group, earned, maximum, percent: maximum > 0 ? Math.round((earned / maximum) * 100) : null };
});

function MetricIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">{children}</span>;
}

function RadarChart({ groups }: { groups: readonly CapabilityScore[] }) {
  const size = 420; const center = size / 2; const radius = 108;
  const pointAt = (index: number, value: number) => { const angle = -Math.PI / 2 + (index * 2 * Math.PI) / groups.length; return { x: center + Math.cos(angle) * radius * value, y: center + Math.sin(angle) * radius * value }; };
  const polygon = (value: number) => groups.map((_, index) => { const point = pointAt(index, value); return `${point.x},${point.y}`; }).join(' ');
  const values = groups.map((group, index) => { const point = pointAt(index, (group.percent ?? 0) / 100); return `${point.x},${point.y}`; }).join(' ');
  return <div className="relative mx-auto w-full max-w-[460px]"><svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img" aria-label="Chỉ số năng lực theo sáu nhóm chủ đề">{[0.25, 0.5, 0.75, 1].map((level) => <polygon key={level} points={polygon(level)} fill="none" stroke="currentColor" strokeWidth="1" className="text-border" />)}{groups.map((_, index) => { const point = pointAt(index, 1); return <line key={index} x1={center} y1={center} x2={point.x} y2={point.y} stroke="currentColor" strokeWidth="1" className="text-border" />; })}<polygon points={values} fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" className="text-primary" />{groups.map((group, index) => { const point = pointAt(index, (group.percent ?? 0) / 100); const label = pointAt(index, 1.42); return <g key={group.key}><title>{group.percent === null ? `${group.description}: Chưa có dữ liệu` : `${group.description}: ${group.percent}% mastery`}</title><circle cx={point.x} cy={point.y} r="3.5" fill="currentColor" className="text-primary" /><text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--color-text-secondary)', fontSize: 13 }}>{group.label}</text></g>; })}</svg><p className="workspace-metadata -mt-1 text-center">Chỉ số được cộng trực tiếp từ score units của các câu đã chấm.</p></div>;
}

const confidenceLabel = (value: LearningAggregate['confidence']): string => value === 'usable' ? 'Đủ dữ liệu' : value === 'low' ? 'Cần thêm dữ liệu' : 'Chưa đủ dữ liệu';
const statusLabel = (value: LearningAggregate['status']): string => value === 'strong' ? 'Vững vàng' : value === 'proficient' ? 'Thành thạo' : value === 'developing' ? 'Đang củng cố' : 'Chưa đủ dữ liệu';
const practiceHref = (topicSlug: string) => `/practice/topic/${topicSlug}`;

export function AnalyticsClient() {
  const [status, setStatus] = useState<AnalyticsStatus>('loading');
  const [overview, setOverview] = useState<LearningOverviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async (): Promise<void> => {
      try {
        setStatus('loading'); setErrorMessage(null);
        if (!await getCurrentUser()) { if (mounted) setStatus('unauthorized'); return; }
        const data = await fetchProtectedJson<LearningOverviewResponse>('/api/me/learning-overview');
        if (mounted) { setOverview(data); setStatus('ready'); }
      } catch (error) {
        if (!mounted) return;
        if (isUnauthorizedError(error)) setStatus('unauthorized');
        else { setErrorMessage('Không tải được phân tích học tập. Hãy thử lại sau.'); setStatus('error'); }
      }
    };
    void load();
    const unsubscribe = subscribeAuthTokenChange(() => { void load(); });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const capabilities = useMemo(() => aggregateCapabilities(overview?.topics ?? []), [overview]);
  const detailedTopics = useMemo(() => [...(overview?.topics ?? [])].filter((topic) => topic.answeredCount > 0 || topic.corpusStatus === 'available').sort((a, b) => Number(b.isWeak) - Number(a.isWeak) || (a.masteryPercent ?? 101) - (b.masteryPercent ?? 101)), [overview]);

  return <main id="main-content" tabIndex={-1} className="min-h-[100dvh] bg-background px-4 py-7 text-text-primary sm:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-[1100px] animate-fade-in flex-col gap-5"><header className="pb-1"><h1 className="workspace-page-title text-text-primary">Tổng quan học tập</h1><p className="workspace-page-description mt-2">Phân tích chi tiết mastery theo chuyên đề và nguồn dữ liệu đã chấm.</p></header>
    {status === 'loading' && <><section className="h-28 animate-pulse rounded-xl border border-border bg-surface" /><div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-[88px] animate-pulse rounded-xl border border-border bg-surface" />)}</div><div className="grid gap-5 lg:grid-cols-2"><section className="h-[360px] animate-pulse rounded-xl border border-border bg-surface" /><section className="h-[360px] animate-pulse rounded-xl border border-border bg-surface" /></div></>}
    {status === 'unauthorized' && <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h2 className="workspace-section-title text-text-primary">Bạn cần đăng nhập để xem phân tích học tập.</h2><p className="workspace-page-description mx-auto mt-2 max-w-md">Đăng nhập ở trang luyện đề để xem tiến độ chi tiết theo chuyên đề.</p><Link href="/dashboard" className="workspace-button-text mt-6 inline-flex h-10 rounded-lg bg-primary px-5 text-white hover:bg-primary-hover">Về trang luyện đề</Link></section>}
    {status === 'error' && <section className="rounded-xl border border-error-border bg-surface p-6 shadow-card"><h2 className="workspace-section-title text-error">Không tải được analytics</h2><p className="workspace-page-description mt-2">{errorMessage}</p></section>}
    {status === 'ready' && overview !== null && <><section className="grid gap-4 rounded-xl border border-border bg-surface p-4 shadow-card sm:grid-cols-[minmax(0,1fr)_minmax(220px,.7fr)] sm:items-center sm:p-5"><div className="flex items-center gap-3"><MetricIcon><span aria-hidden="true">▥</span></MetricIcon><div className="min-w-0 flex-1"><h2 className="workspace-item-title text-text-primary">Hồ sơ mastery</h2><p className="workspace-metadata mt-1">{overview.overall.answeredCount} câu đã trả lời · {confidenceLabel(overview.overall.confidence)}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background-alt"><div className="h-full rounded-full bg-primary" style={{ width: `${overview.overall.masteryPercent ?? 0}%` }} /></div></div></div><p className="border-t border-border pt-3 text-sm leading-5 text-text-secondary sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">Câu bỏ trống làm giảm mastery, nhưng không làm tăng số mẫu dùng để đánh giá độ tin cậy.</p></section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Mastery', overview.overall.masteryPercent === null ? '—' : `${overview.overall.masteryPercent}%`, '◎'], ['Câu đã trả lời', overview.overall.answeredCount, '▤'], ['Từ đề / luyện tập', `${overview.overall.examQuestionCount}/${overview.overall.practiceQuestionCount}`, '▥'], ['Đúng hoàn toàn', overview.overall.fullyCorrectCount, '★']].map(([label, value, icon]) => <article key={String(label)} className="flex min-h-[88px] items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card"><MetricIcon><span aria-hidden="true">{icon}</span></MetricIcon><div><p className="workspace-metadata">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{value}</p></div></article>)}</section>
      <section className="grid gap-5 lg:grid-cols-2"><article className="min-h-[360px] rounded-xl border border-border bg-surface p-5 shadow-card"><div className="flex items-center justify-between"><h2 className="workspace-section-title text-text-primary">Chỉ số năng lực</h2><span className="text-text-muted" title="Chỉ số mô tả kết quả đã chấm, không phải đánh giá năng lực tuyệt đối." aria-label="Thông tin về chỉ số năng lực">ⓘ</span></div><RadarChart groups={capabilities} /></article><article className="flex min-h-[360px] flex-col rounded-xl border border-border bg-surface p-5 shadow-card"><h2 className="workspace-section-title text-text-primary">Nguồn dữ liệu mastery</h2><div className="mt-4 divide-y divide-border border-y border-border"><div className="flex items-center justify-between py-4"><span>Đề thi đã nộp</span><strong>{overview.overall.examQuestionCount} câu</strong></div><div className="flex items-center justify-between py-4"><span>Phiên luyện tập hoàn thành</span><strong>{overview.overall.practiceQuestionCount} câu</strong></div><div className="flex items-center justify-between py-4"><span>Score units đã chấm</span><strong>{overview.overall.earnedScoreUnits}/{overview.overall.maxScoreUnits}</strong></div></div><p className="workspace-page-description mt-auto">Corpus chưa đủ câu được đánh dấu riêng; điều đó không đồng nghĩa bạn yếu ở chuyên đề ấy.</p></article></section>
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="border-b border-border px-5 py-4"><h2 className="workspace-section-title text-text-primary">Chi tiết theo chuyên đề</h2></div>{detailedTopics.length ? <div className="divide-y divide-border">{detailedTopics.map((topic) => <div key={topic.topicSlug} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_72px_130px_132px_64px] md:items-center"><div className="min-w-0"><p className="workspace-item-title truncate text-text-primary">{topic.topicName}</p><p className="workspace-metadata mt-1">{topic.answeredCount} câu đã trả lời · đề {topic.examQuestionCount}, luyện tập {topic.practiceQuestionCount} · {confidenceLabel(topic.confidence)}</p></div><span className="workspace-metadata">{topic.fullyCorrectCount}/{topic.answeredCount}</span><div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background-alt"><div className="h-full rounded-full bg-primary" style={{ width: `${topic.masteryPercent ?? 0}%` }} /></div><span className="workspace-badge-text text-text-secondary">{topic.masteryPercent === null ? '—' : `${topic.masteryPercent}%`}</span></div><span className={`workspace-badge-text w-fit rounded-md px-2 py-1 ${topic.isWeak ? 'bg-warning-light text-warning' : 'bg-primary-50 text-primary'}`}>{topic.corpusStatus === 'insufficient' ? 'Kho câu chưa đủ' : statusLabel(topic.status)}</span><Link href={practiceHref(topic.topicSlug)} className="workspace-button-text text-primary hover:text-primary-hover">Luyện →</Link></div>)}</div> : <p className="workspace-page-description px-5 py-8">Chưa có đủ dữ liệu theo chuyên đề để hiển thị phân tích chi tiết.</p>}</section>
    </>}
  </div></main>;
}
