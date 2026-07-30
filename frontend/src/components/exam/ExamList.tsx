import { useState } from 'react';
import Link from 'next/link';
import { ExamCard } from './ExamCard';
import { Logo } from './Logo';
import { TypewriterText } from './TypewriterText';

import type {
  ExamDifficulty,
  ExamDurationFilter,
  ExamListItem,
  TopicFilterDto,
} from './types';
import type { UserStats } from '../../lib/userStats';
import { Footer } from './Footer';

type ExamListProps = {
  exams: ExamListItem[];
  stats?: UserStats | null;
  draftExamId?: string | null;
  searchInput: string;
  selectedTopic: string;
  selectedSubtopic: string;
  selectedDuration: ExamDurationFilter;
  selectedDifficulty: '' | ExamDifficulty;
  selectedYear: string;
  selectedSource: string;
  topics: TopicFilterDto[];
  listError?: string | null;
  topicsError?: string | null;
  isFiltering?: boolean;
  onSearchChange: (value: string) => void;
  onTopicChange: (value: string) => void;
  onSubtopicChange: (value: string) => void;
  onDurationChange: (value: ExamDurationFilter) => void;
  onDifficultyChange: (value: '' | ExamDifficulty) => void;
  onYearChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onClearFilters: () => void;
};

const difficultyLabels: Record<ExamListItem['difficulty'], string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

const durationFilterLabels: Record<ExamDurationFilter, string> = {
  all: 'Tất cả thời lượng',
  short: '<= 45 phút',
  standard: '46-90 phút',
  long: '> 90 phút',
};

export function ExamList({
  exams,
  stats,
  draftExamId,
  searchInput,
  selectedTopic,
  selectedSubtopic,
  selectedDuration,
  selectedDifficulty,
  selectedYear,
  selectedSource,
  topics,
  listError,
  topicsError,
  isFiltering = false,
  onSearchChange,
  onTopicChange,
  onSubtopicChange,
  onDurationChange,
  onDifficultyChange,
  onYearChange,
  onSourceChange,
  onClearFilters,
}: ExamListProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const recommendedExams = exams.slice(0, 3);

  const draftExam = draftExamId ? exams.find((e) => e.id === draftExamId) : null;
  const selectedTopicData = topics.find((topic) => topic.slug === selectedTopic) ?? null;
  const subtopicOptions = selectedTopicData?.subtopics ?? [];
  const selectedSubtopicData =
    subtopicOptions.find((subtopic) => subtopic.slug === selectedSubtopic) ?? null;
  const hasActiveFilters =
    searchInput.trim().length > 0 ||
    selectedTopic.length > 0 ||
    selectedSubtopic.length > 0 ||
    selectedDuration !== 'all' ||
    selectedDifficulty.length > 0 ||
    selectedYear.trim().length > 0 ||
    selectedSource.trim().length > 0;
  const activeFilterChips = [
    searchInput.trim().length > 0
      ? {
        key: 'search',
        label: `Tìm kiếm: ${searchInput.trim()}`,
        onRemove: () => onSearchChange(''),
      }
      : null,
    selectedTopicData
      ? {
        key: 'topic',
        label: selectedTopicData.name,
        onRemove: () => onTopicChange(''),
      }
      : null,
    selectedSubtopicData
      ? {
        key: 'subtopic',
        label: selectedSubtopicData.name,
        onRemove: () => onSubtopicChange(''),
      }
      : null,
    selectedDuration !== 'all'
      ? {
        key: 'duration',
        label: durationFilterLabels[selectedDuration],
        onRemove: () => onDurationChange('all'),
      }
      : null,
    selectedDifficulty
      ? {
        key: 'difficulty',
        label: difficultyLabels[selectedDifficulty],
        onRemove: () => onDifficultyChange(''),
      }
      : null,
    selectedYear.trim().length > 0
      ? {
        key: 'year',
        label: `Năm ${selectedYear.trim()}`,
        onRemove: () => onYearChange(''),
      }
      : null,
    selectedSource.trim().length > 0
      ? {
        key: 'source',
        label: `Nguồn: ${selectedSource.trim()}`,
        onRemove: () => onSourceChange(''),
      }
      : null,
  ].filter(
    (
      chip,
    ): chip is {
      key: string;
      label: string;
      onRemove: () => void;
    } => chip !== null,
  );

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <main className="flex-1 bg-background pb-16 text-text-primary">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="relative pb-10">
            <div
              className="pointer-events-none absolute -top-10 right-0 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl"
              aria-hidden="true"
            />

            <div className="flex flex-col gap-8 pt-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    Xin chào,
                  </p>
                  <h1 className="mt-1 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                    Chọn đề để chinh phục hôm nay
                  </h1>
                  <p className="mt-2 text-base text-text-secondary">
                    Luyện tập mỗi ngày để tiến bộ vượt bậc
                  </p>
                </div>
              </div>

            </div>
          </header>

          <div>
            <div className="space-y-8">
              {draftExam && (
                <section className="animate-fade-in flex flex-col justify-between gap-4 rounded-xl border border-warning-border bg-warning-light p-5 shadow-card sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-warning-dark"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <h2 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-warning-dark">
                        Bạn có bài làm chưa hoàn thành
                      </h2>
                    </div>
                    <p className="mt-1 text-sm font-medium text-warning-dark/80">
                      {draftExam.title}
                    </p>
                  </div>
                  <Link
                    href={`/exam/${draftExam.id}`}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-warning px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-warning/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2"
                  >
                    Tiếp tục làm bài
                  </Link>
                </section>
              )}

              <section>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                      Đề luyện thi đề xuất
                    </h2>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-primary">
                    {recommendedExams.length} đề
                  </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  {recommendedExams.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} />
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                <div className="border-b border-border px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                        Danh sách đề thi
                      </h2>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text-secondary">
                      {exams.length} đề khả dụng
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input
                          type="text"
                          value={searchInput}
                          onChange={(event) => onSearchChange(event.target.value)}
                          placeholder="Tìm kiếm tên đề, chuyên đề hoặc nguồn đề..."
                          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`inline-flex h-10 shrink-0 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors ${hasActiveFilters || isFilterOpen
                            ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                            : 'border-border bg-surface text-text-secondary hover:bg-background-alt hover:text-text-primary'
                          }`}
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                        </svg>
                        Bộ lọc {activeFilterChips.length > 0 && `(${activeFilterChips.length})`}
                      </button>
                    </div>

                    <div className={`grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 ${isFilterOpen ? 'grid' : 'hidden lg:grid'}`}>
                      <select
                        value={selectedTopic}
                        onChange={(event) => onTopicChange(event.target.value)}
                        className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
                      >
                        <option value="">Chuyên đề</option>
                        {topics.map((topic) => (
                          <option key={topic.id} value={topic.slug}>
                            {topic.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedSubtopic}
                        onChange={(event) => onSubtopicChange(event.target.value)}
                        disabled={!selectedTopicData}
                        className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary outline-none transition disabled:cursor-not-allowed disabled:opacity-50 focus:border-primary"
                      >
                        <option value="">
                          {selectedTopicData ? 'Tiểu chuyên đề' : 'Chọn chuyên đề'}
                        </option>
                        {subtopicOptions.map((subtopic) => (
                          <option key={subtopic.id} value={subtopic.slug}>
                            {subtopic.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedDuration}
                        onChange={(event) => onDurationChange(event.target.value as ExamDurationFilter)}
                        className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
                      >
                        <option value="all">Thời gian</option>
                        <option value="short">&lt;= 45 phút</option>
                        <option value="standard">46-90 phút</option>
                        <option value="long">&gt; 90 phút</option>
                      </select>

                      <select
                        value={selectedDifficulty}
                        onChange={(event) => onDifficultyChange(event.target.value as '' | ExamDifficulty)}
                        className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
                      >
                        <option value="">Độ khó</option>
                        <option value="easy">Dễ</option>
                        <option value="medium">Trung bình</option>
                        <option value="hard">Khó</option>
                      </select>

                      <input
                        type="number"
                        min={1900}
                        max={2100}
                        value={selectedYear}
                        onChange={(event) => onYearChange(event.target.value)}
                        placeholder="Năm"
                        className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
                      />

                      <input
                        type="text"
                        value={selectedSource}
                        onChange={(event) => onSourceChange(event.target.value)}
                        placeholder="Nguồn"
                        className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {activeFilterChips.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {activeFilterChips.map((chip) => (
                          <span
                            key={chip.key}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background-alt px-2 py-1 text-xs font-medium text-text-secondary"
                          >
                            {chip.label}
                            <button
                              type="button"
                              onClick={chip.onRemove}
                              aria-label={`Xóa ${chip.label}`}
                              className="text-text-muted hover:text-text-primary"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={onClearFilters}
                          className="ml-1 text-xs font-medium text-text-muted hover:text-text-primary"
                        >
                          Xóa tất cả
                        </button>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                      {isFiltering ? <span>Đang cập nhật danh sách đề...</span> : null}
                      {listError ? <span className="text-warning-dark">{listError}</span> : null}
                      {topicsError ? <span className="text-warning-dark">{topicsError}</span> : null}
                    </div>
                  </div>
                </div>

                {exams.length === 0 ? (
                  <div className="px-5 py-10">
                    <div className="rounded-xl border border-dashed border-border bg-background px-6 py-8 text-center">
                      <h3 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-text-primary">
                        Không tìm thấy đề phù hợp với bộ lọc hiện tại
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        Thử thay đổi từ khóa, chuyên đề hoặc xóa bộ lọc để xem nhiều đề hơn.
                      </p>
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={onClearFilters}
                          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 pt-0">
                    <div className="hidden md:flex items-center justify-between border-b border-border pb-3 pt-4 px-3 -mx-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="text-xs font-semibold text-text-secondary">Đề thi</span>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-6 md:justify-end">
                        <div className="w-20 text-right">
                          <span className="text-xs font-semibold text-text-secondary">Lượt làm</span>
                        </div>
                        <div className="w-28 shrink-0 flex justify-center">
                          <span className="text-xs font-semibold text-text-secondary">Độ khó</span>
                        </div>
                        <div className="w-[72px]"></div>
                      </div>
                    </div>
                    <div className="divide-y divide-border pt-1">
                      {exams.map((exam) => (
                        <ExamCard key={exam.id} exam={exam} variant="compact" />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>


          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
