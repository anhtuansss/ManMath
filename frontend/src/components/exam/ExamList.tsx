import { useState } from 'react';
import Link from 'next/link';
import { ExamCard } from './ExamCard';
import { Logo } from './Logo';
import { TypewriterText } from './TypewriterText';
import { RecommendationCard } from './RecommendationCard';
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
  const totalQuestions = exams.reduce((sum, exam) => sum + exam.totalQuestions, 0);
  const averageDuration =
    exams.length > 0
      ? Math.round(
          exams.reduce((sum, exam) => sum + exam.durationMinutes, 0) / exams.length,
        )
      : 0;
  const hardExamCount = exams.filter((exam) => exam.difficulty === 'hard').length;
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
                  <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                    Tuyển tập đề thi mới nhất
                  </p>
                  <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-outfit)] text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:leading-[1.1]">
                    <TypewriterText text="Nền tảng luyện đề Toán THPT miễn phí" />
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
                    Làm đề có đồng hồ, chấm điểm tự động, xem lại lỗi sai và theo dõi
                    tiến bộ sau mỗi lần luyện.
                  </p>
                </div>
              </div>

            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                      Bắt đầu nhanh
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Một vài đề nổi bật để bạn làm thử ngay.
                    </p>
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
                      <p className="mt-1 text-sm text-text-secondary">
                        Scan nhanh số câu, thời lượng và độ khó trước khi vào đề.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text-secondary">
                      {exams.length} đề khả dụng
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Tìm kiếm
                      </span>
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Nhập tên đề, chuyên đề hoặc nguồn đề..."
                        className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>

                    <div className="md:hidden">
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition hover:bg-background-alt"
                      >
                        {hasActiveFilters ? 'Bộ lọc (đang áp dụng)' : 'Bộ lọc'}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`ml-2 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>

                    <div className={`grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 ${isFilterOpen ? 'grid' : 'hidden md:grid'}`}>
                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Chuyên đề
                        </span>
                        <select
                          value={selectedTopic}
                          onChange={(event) => onTopicChange(event.target.value)}
                          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        >
                          <option value="">Tất cả chuyên đề</option>
                          {topics.map((topic) => (
                            <option key={topic.id} value={topic.slug}>
                              {topic.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Tiểu chuyên đề
                        </span>
                        <select
                          value={selectedSubtopic}
                          onChange={(event) => onSubtopicChange(event.target.value)}
                          disabled={!selectedTopicData}
                          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-primary focus:ring-2 focus:ring-primary/15"
                        >
                          <option value="">
                            {selectedTopicData
                              ? 'Tất cả tiểu chuyên đề'
                              : 'Chọn chuyên đề trước'}
                          </option>
                          {subtopicOptions.map((subtopic) => (
                            <option key={subtopic.id} value={subtopic.slug}>
                              {subtopic.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Thời lượng
                        </span>
                        <select
                          value={selectedDuration}
                          onChange={(event) =>
                            onDurationChange(event.target.value as ExamDurationFilter)
                          }
                          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        >
                          <option value="all">Tất cả thời lượng</option>
                          <option value="short">&lt;= 45 phút</option>
                          <option value="standard">46-90 phút</option>
                          <option value="long">&gt; 90 phút</option>
                        </select>
                      </label>

                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Độ khó
                        </span>
                        <select
                          value={selectedDifficulty}
                          onChange={(event) =>
                            onDifficultyChange(event.target.value as '' | ExamDifficulty)
                          }
                          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        >
                          <option value="">Tất cả độ khó</option>
                          <option value="easy">Dễ</option>
                          <option value="medium">Trung bình</option>
                          <option value="hard">Khó</option>
                        </select>
                      </label>

                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Năm
                        </span>
                        <input
                          type="number"
                          min={1900}
                          max={2100}
                          value={selectedYear}
                          onChange={(event) => onYearChange(event.target.value)}
                          placeholder="Nhập năm..."
                          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                      </label>

                      <label className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Nguồn đề
                        </span>
                        <input
                          type="text"
                          value={selectedSource}
                          onChange={(event) => onSourceChange(event.target.value)}
                          placeholder="Nhập nguồn đề..."
                          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {hasActiveFilters ? (
                      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Đang lọc
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {activeFilterChips.map((chip) => (
                              <span
                                key={chip.key}
                                className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"
                              >
                                <span className="min-w-0 truncate">{chip.label}</span>
                                <button
                                  type="button"
                                  onClick={chip.onRemove}
                                  aria-label={`Xóa bộ lọc ${chip.label}`}
                                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-primary transition hover:bg-primary/10"
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={onClearFilters}
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface px-4 text-xs font-semibold text-text-primary transition hover:border-primary hover:text-primary"
                        >
                          Xóa bộ lọc
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
                  <div className="divide-y divide-border">
                    {exams.map((exam) => (
                      <ExamCard key={exam.id} exam={exam} variant="compact" />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              {stats && stats.currentStreak > 0 ? (
                <div className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        {stats.currentStreak} ngày liên tiếp!
                      </p>
                      <p className="text-xs text-amber-700">Giữ vững phong độ nhé.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <RecommendationCard />

              <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-primary"
                  >
                    <rect
                      x="2"
                      y="8"
                      width="3"
                      height="6"
                      rx="0.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <rect
                      x="6.5"
                      y="4"
                      width="3"
                      height="10"
                      rx="0.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <rect
                      x="11"
                      y="6"
                      width="3"
                      height="8"
                      rx="0.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>
                  <h2 className="font-[family-name:var(--font-outfit)] text-base font-semibold text-text-primary">
                    Tổng quan kho đề
                  </h2>
                </div>
                <div className="mt-4 divide-y divide-border text-sm">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-text-secondary">Tổng số câu</span>
                    <span className="font-semibold text-text-primary">
                      {totalQuestions} câu
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-text-secondary">Thời lượng trung bình</span>
                    <span className="font-semibold text-text-primary">
                      {averageDuration} phút
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-text-secondary">Đề khó</span>
                    <span className="font-semibold text-text-primary">
                      {hardExamCount} đề
                    </span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
