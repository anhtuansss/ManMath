import { useState } from 'react';
import Link from 'next/link';
import { ExamCard } from './ExamCard';
import { RecommendationCard } from './RecommendationCard';

import type {
  ExamDifficulty,
  ExamDurationFilter,
  ExamListItem,
  TopicFilterDto,
} from './types';
import { Footer } from './Footer';

type ExamListProps = {
  exams: ExamListItem[];
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
  isAuthenticated: boolean;
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
  isAuthenticated,
}: ExamListProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const quickStartExams = exams.slice(0, 3);

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
      <main id="main-content" tabIndex={-1} className="flex-1 bg-background pb-16 text-text-primary">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
          <header className="pb-6">
            <p className="workspace-eyebrow">{isAuthenticated ? 'Xin chào, chúc bạn học tốt' : 'Luyện đề Toán THPT'}</p>
            <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="workspace-page-title text-text-primary">Chọn đề để chinh phục hôm nay</h1>
                <p className="workspace-page-description mt-2">Luyện tập mỗi ngày để tiến bộ vững vàng hơn.</p>
              </div>
              <Link href="#exam-library" className="workspace-button-text inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface px-4 text-text-secondary transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Khám phá kho đề <span className="ml-2" aria-hidden="true">→</span></Link>
            </div>
          </header>

          <div className="space-y-6">
              {draftExam && (
                <section className="animate-fade-in flex min-h-[80px] flex-col justify-between gap-3 rounded-xl border border-primary/25 bg-primary-50 px-4 py-4 shadow-card sm:flex-row sm:items-center sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary" aria-hidden="true">▤</span>
                    <div className="min-w-0">
                      <p className="workspace-badge-text text-primary">Tiếp tục bài đang làm</p>
                      <h2 className="workspace-item-title mt-0.5 truncate text-text-primary">{draftExam.title}</h2>
                      <p className="workspace-metadata mt-0.5">Bài làm của bạn đang được lưu tự động</p>
                    </div>
                  </div>
                  <Link
                    href={draftExam.href}
                    className="workspace-button-text inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Tiếp tục <span className="ml-2" aria-hidden="true">→</span>
                  </Link>
                </section>
              )}

              {quickStartExams.length > 0 && (
              <section>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2"><span className="text-lg text-warning" aria-hidden="true">ϟ</span><h2 className="workspace-section-title text-text-primary">Đề luyện đề xuất</h2></div>
                    <p className="workspace-page-description mt-1">Chọn nhanh từ các đề đang có trong kho để bắt đầu luyện tập.</p>
                  </div>
                  <Link href="#exam-library" className="workspace-button-text shrink-0 text-primary hover:text-primary-hover">Xem tất cả <span className="ml-1" aria-hidden="true">→</span></Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {quickStartExams.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} />
                  ))}
                </div>
              </section>
              )}

              <div className="grid gap-6 xl:grid-cols-[minmax(0,68fr)_minmax(300px,32fr)]">
              <section id="exam-library" className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="border-b border-border px-5 py-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="workspace-section-title text-text-primary">Danh sách đề thi</h2>
                      <p className="workspace-page-description mt-1">Duyệt, lọc và bắt đầu đề phù hợp.</p>
                    </div>
                    <span className="workspace-badge-text shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-text-secondary">
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
                          aria-label="Tìm kiếm đề"
                          value={searchInput}
                          onChange={(event) => onSearchChange(event.target.value)}
                          placeholder="Tìm kiếm tên đề, chuyên đề hoặc nguồn đề..."
                          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        aria-expanded={isFilterOpen}
                        aria-controls="exam-library-filters"
                        className={`workspace-button-text inline-flex h-10 shrink-0 items-center justify-center rounded-lg border px-4 transition-colors ${hasActiveFilters || isFilterOpen
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

                    <div id="exam-library-filters" className={`grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 ${isFilterOpen ? 'grid' : 'hidden'}`}>
                      <select
                        aria-label="Lọc theo chuyên đề"
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
                        aria-label="Lọc theo tiểu chuyên đề"
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
                        aria-label="Lọc theo thời gian"
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
                        aria-label="Lọc theo độ khó"
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
                        aria-label="Lọc theo năm"
                        min={1900}
                        max={2100}
                        value={selectedYear}
                        onChange={(event) => onYearChange(event.target.value)}
                        placeholder="Năm"
                        className="h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text-primary outline-none transition focus:border-primary"
                      />

                      <input
                        type="text"
                        aria-label="Lọc theo nguồn đề"
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
                            className="workspace-badge-text inline-flex items-center gap-1.5 rounded-md border border-border bg-background-alt px-2 py-1 text-text-secondary"
                          >
                            {chip.label}
                            <button
                              type="button"
                              onClick={chip.onRemove}
                              aria-label={`Xóa ${chip.label}`}
                              className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-text-muted hover:text-text-primary"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={onClearFilters}
                          className="workspace-button-text ml-1 min-h-11 px-2 text-text-muted hover:text-text-primary"
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
                      <h3 className="workspace-section-title text-text-primary">
                        Không tìm thấy đề phù hợp với bộ lọc hiện tại
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        Thử thay đổi từ khóa, chuyên đề hoặc xóa bộ lọc để xem nhiều đề hơn.
                      </p>
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={onClearFilters}
                          className="workspace-button-text inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-white transition hover:bg-primary-hover"
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 pb-2 pt-1">
                    <div className="divide-y divide-border">
                      {exams.map((exam) => (
                        <ExamCard key={exam.id} exam={exam} variant="compact" />
                      ))}
                    </div>
                  </div>
                )}
              </section>
              <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              {isAuthenticated ? (
                <RecommendationCard />
              ) : (
                <section className="border-l-2 border-primary bg-primary-light/40 px-5 py-4">
                  <h2 className="workspace-item-title text-text-primary">Lưu lịch sử và xem phân tích cá nhân</h2>
                  <p className="workspace-page-description mt-2">Đăng nhập khi bạn muốn theo dõi các lượt làm và chuyên đề cần ôn.</p>
                </section>
              )}
              </aside>
              </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
