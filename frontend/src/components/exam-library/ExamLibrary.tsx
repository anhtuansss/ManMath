'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ExamDifficulty, ExamDurationFilter, ExamListItem, TopicFilterDto } from '../exam/types';
import { ExamLibraryHero } from './ExamLibraryHero';
import { ExamFilterSidebar } from './ExamFilterSidebar';
import { ExamCatalogToolbar } from './ExamCatalogToolbar';
import { ExamGrid } from './ExamGrid';

type Props = { exams: ExamListItem[]; searchInput: string; selectedTopic: string; selectedSubtopic: string; selectedDuration: ExamDurationFilter; selectedDifficulty: '' | ExamDifficulty; selectedYear: string; selectedSource: string; topics: TopicFilterDto[]; listError?: string | null; topicsError?: string | null; isFiltering?: boolean; onSearchChange: (value: string) => void; onTopicChange: (value: string) => void; onSubtopicChange: (value: string) => void; onDurationChange: (value: ExamDurationFilter) => void; onDifficultyChange: (value: '' | ExamDifficulty) => void; onYearChange: (value: string) => void; onSourceChange: (value: string) => void; onClearFilters: () => void };
const PER_PAGE = 12;
export function ExamLibrary(props: Props) {
  const [filterOpen, setFilterOpen] = useState(false); const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [props.exams]);
  const pages = Math.max(1, Math.ceil(props.exams.length / PER_PAGE)); const safePage = Math.min(page, pages);
  const displayed = useMemo(() => props.exams.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE), [props.exams, safePage]);
  const activeFilters = [props.selectedTopic, props.selectedSubtopic, props.selectedDuration !== 'all' ? 'duration' : '', props.selectedDifficulty, props.selectedYear, props.selectedSource].filter(Boolean).length;
  const filterProps = { open: filterOpen, topics: props.topics, selectedTopic: props.selectedTopic, selectedSubtopic: props.selectedSubtopic, selectedDuration: props.selectedDuration, selectedDifficulty: props.selectedDifficulty, selectedYear: props.selectedYear, selectedSource: props.selectedSource, onClose: () => setFilterOpen(false), onTopicChange: props.onTopicChange, onSubtopicChange: props.onSubtopicChange, onDurationChange: props.onDurationChange, onDifficultyChange: props.onDifficultyChange, onYearChange: props.onYearChange, onSourceChange: props.onSourceChange, onClear: props.onClearFilters };
  return <main id="main-content" tabIndex={-1} className="min-h-screen bg-background pb-16 text-text-primary"><div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6 lg:px-9"><ExamLibraryHero examCount={props.exams.length} topicCount={props.topics.length} /><div className="flex items-start gap-7"><ExamFilterSidebar {...filterProps} /><section className="min-w-0 flex-1"><ExamCatalogToolbar value={props.searchInput} activeCount={activeFilters} onChange={props.onSearchChange} onOpenFilters={() => setFilterOpen(true)} />{props.topicsError ? <p className="mt-3 text-xs text-text-muted">Bộ lọc chuyên đề tạm thời chưa tải được.</p> : null}{props.listError ? <p className="mt-3 rounded-lg border border-error-border bg-error-light px-3 py-2 text-sm text-error">{props.listError}</p> : null}<div className="mt-5"><ExamGrid exams={displayed} isFiltering={props.isFiltering ?? false} /></div>{pages > 1 ? <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Phân trang kho đề"><button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} className="h-9 rounded-lg border border-border px-3 text-sm font-semibold text-text-secondary disabled:opacity-40">Trước</button><span className="text-sm text-text-secondary">Trang {safePage} / {pages}</span><button type="button" disabled={safePage === pages} onClick={() => setPage(safePage + 1)} className="h-9 rounded-lg border border-border px-3 text-sm font-semibold text-text-secondary disabled:opacity-40">Sau</button></nav> : null}</section></div></div></main>;
}
