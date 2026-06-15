'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExamList } from './ExamList';
import type {
  ExamDifficulty,
  ExamDurationFilter,
  ExamListApiItem,
  ExamListItem,
  TopicFilterDto,
  TopicsResponseDto,
} from './types';
import { API_BASE_URL } from '../../config/api';
import { getUserStats, type UserStats } from '../../lib/userStats';

const toExamListItem = (exam: ExamListApiItem): ExamListItem => ({
  ...exam,
  href: `/exam/${exam.id}`,
});

function ExamListSkeleton() {
  return (
    <main className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-primary-light" />
                <div>
                  <div className="h-4 w-24 animate-pulse rounded-md bg-slate-200" />
                  <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-slate-100" />
                </div>
              </div>
              <div className="mt-7 h-4 w-36 animate-pulse rounded-md bg-primary-light" />
              <div className="mt-3 h-10 w-80 max-w-full animate-pulse rounded-md bg-slate-200" />
              <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-md bg-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[380px]">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-lg border border-border bg-surface px-4 py-3 shadow-card"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-slate-200" />
                    <div className="h-3 w-12 rounded bg-slate-100" />
                  </div>
                  <div className="mt-3 h-6 w-12 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-8">
            <section>
              <div className="mb-5">
                <div className="h-6 w-48 animate-pulse rounded-md bg-slate-200" />
                <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded-md bg-slate-100" />
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="min-h-[240px] animate-pulse rounded-xl border border-border border-t-[3px] border-t-slate-200 bg-surface p-5 shadow-card"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="h-3 w-20 rounded bg-slate-100" />
                        <div className="mt-3 h-5 w-4/5 rounded bg-slate-200" />
                      </div>
                      <div className="h-5 w-14 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-4 h-4 w-full rounded bg-slate-100" />
                    <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
                    <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
                      <div className="h-10 rounded bg-slate-100" />
                      <div className="h-10 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <div className="border-b border-border px-5 py-4">
                <div className="h-6 w-40 animate-pulse rounded-md bg-slate-200" />
                <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded-md bg-slate-100" />
              </div>
              <div className="divide-y divide-border">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse px-5 py-4">
                    <div className="h-3 w-20 rounded bg-slate-100" />
                    <div className="mt-2 h-5 w-2/3 rounded bg-slate-200" />
                    <div className="mt-3 flex gap-4">
                      <div className="h-3 w-16 rounded bg-slate-100" />
                      <div className="h-3 w-16 rounded bg-slate-100" />
                      <div className="h-3 w-16 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-xl border border-border bg-surface p-5 shadow-card"
              >
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-slate-200" />
                  <div className="h-5 w-36 rounded bg-slate-200" />
                </div>
                <div className="mt-5 space-y-3">
                  <div className="h-4 rounded bg-slate-100" />
                  <div className="h-4 rounded bg-slate-100" />
                  <div className="h-4 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </main>
  );
}

type ExamListErrorProps = {
  message: string;
  onRetry: () => void;
};

function ExamListError({ message, onRetry }: ExamListErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-text-primary">
      <section className="w-full max-w-xl animate-fade-in rounded-xl border border-error-border bg-surface p-8 shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-light">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-error">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M12 8v4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16" r="0.75" fill="currentColor" />
          </svg>
        </div>

        <h1 className="mt-5 text-center font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-text-primary">
          Kiểm tra backend rồi thử lại
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-text-secondary">
          {message}. Hãy đảm bảo backend đang chạy và cấu hình API base URL của
          frontend đang trỏ đúng môi trường hiện tại.
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
              <path
                d="M2.5 8a5.5 5.5 0 0 1 9.37-3.9L13.5 2.5v4h-4l1.6-1.6A3.5 3.5 0 1 0 11.5 8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Thử lại
          </button>
        </div>
      </section>
    </main>
  );
}

type ExamListEmptyProps = {
  onRetry: () => void;
};

function ExamListEmpty({ onRetry }: ExamListEmptyProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-text-primary">
      <section className="w-full max-w-xl animate-fade-in rounded-xl border border-border bg-surface p-8 shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-card">
          <span className="text-2xl font-bold text-white">M</span>
        </div>

        <h1 className="mt-5 text-center font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-text-primary">
          Chưa có đề luyện nào
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-text-secondary">
          API đã trả về danh sách rỗng. Khi backend có dữ liệu đề, màn này sẽ hiển
          thị khu đề đề xuất, danh sách đề và tổng quan kho đề.
        </p>

        <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-background-alt">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-text-muted">
            <path
              d="M9 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M9 7h6M9 11h6M9 15h3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
              <path
                d="M2.5 8a5.5 5.5 0 0 1 9.37-3.9L13.5 2.5v4h-4l1.6-1.6A3.5 3.5 0 1 0 11.5 8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Tải lại danh sách
          </button>
        </div>
      </section>
    </main>
  );
}

export function ExamListClient() {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [topics, setTopics] = useState<TopicFilterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [draftExamId, setDraftExamId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [selectedDuration, setSelectedDuration] =
    useState<ExamDurationFilter>('all');
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<'' | ExamDifficulty>('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const selectedTopicData = useMemo(
    () => topics.find((topic) => topic.slug === selectedTopic) ?? null,
    [selectedTopic, topics],
  );

  const fetchTopics = async () => {
    try {
      setTopicsError(null);

      const response = await fetch(`${API_BASE_URL}/api/topics`);

      if (!response.ok) {
        throw new Error('Không tải được danh sách chuyên đề');
      }

      const data: TopicsResponseDto = await response.json();
      setTopics(data.topics);
    } catch (fetchError) {
      setTopics([]);
      setTopicsError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Không tải được danh sách chuyên đề',
      );
    }
  };

  const fetchExams = async (params?: {
    search?: string;
    topic?: string;
    subtopic?: string;
    durationMin?: number;
    durationMax?: number;
    difficulty?: '' | ExamDifficulty;
    year?: string;
    source?: string;
    initialLoad?: boolean;
  }) => {
    const isInitialLoad = params?.initialLoad ?? false;

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsFiltering(true);
      }

      setError(null);

      const searchParams = new URLSearchParams();

      if (params?.search?.trim()) {
        searchParams.set('search', params.search.trim());
      }

      if (params?.topic?.trim()) {
        searchParams.set('topic', params.topic.trim());
      }

      if (params?.subtopic?.trim()) {
        searchParams.set('subtopic', params.subtopic.trim());
      }

      if (typeof params?.durationMin === 'number') {
        searchParams.set('durationMin', params.durationMin.toString());
      }

      if (typeof params?.durationMax === 'number') {
        searchParams.set('durationMax', params.durationMax.toString());
      }

      if (params?.difficulty) {
        searchParams.set('difficulty', params.difficulty);
      }

      if (params?.year?.trim()) {
        searchParams.set('year', params.year.trim());
      }

      if (params?.source?.trim()) {
        searchParams.set('source', params.source.trim());
      }

      const queryString = searchParams.toString();
      const url = queryString
        ? `${API_BASE_URL}/api/exams?${queryString}`
        : `${API_BASE_URL}/api/exams`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Không tải được danh sách đề thi');
      }

      const data: ExamListApiItem[] = await response.json();
      setExams(data.map(toExamListItem));
      setHasLoadedOnce(true);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Lỗi không xác định khi tải danh sách đề thi',
      );
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    void fetchExams({ initialLoad: true });
    void fetchTopics();
    setStats(getUserStats());

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('manmath:exam-draft:')) {
          setDraftExamId(key.split(':')[2]);
          break;
        }
      }
    } catch {
      // safe localStorage access
    }
  }, []);

  useEffect(() => {
    if (!selectedTopicData && selectedSubtopic) {
      setSelectedSubtopic('');
      return;
    }

    if (
      selectedSubtopic &&
      !selectedTopicData?.subtopics.some((subtopic) => subtopic.slug === selectedSubtopic)
    ) {
      setSelectedSubtopic('');
    }
  }, [selectedSubtopic, selectedTopicData]);

  useEffect(() => {
    if (!hasLoadedOnce) {
      return;
    }

    const getDurationRange = (): { durationMin?: number; durationMax?: number } => {
      if (selectedDuration === 'short') {
        return { durationMax: 45 };
      }

      if (selectedDuration === 'standard') {
        return { durationMin: 46, durationMax: 90 };
      }

      if (selectedDuration === 'long') {
        return { durationMin: 91 };
      }

      return {};
    };

    const timeoutId = window.setTimeout(() => {
      const durationRange = getDurationRange();

      void fetchExams({
        search: searchInput,
        topic: selectedTopic,
        subtopic: selectedSubtopic,
        durationMin: durationRange.durationMin,
        durationMax: durationRange.durationMax,
        difficulty: selectedDifficulty,
        year: selectedYear,
        source: selectedSource,
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    hasLoadedOnce,
    searchInput,
    selectedTopic,
    selectedSubtopic,
    selectedDuration,
    selectedDifficulty,
    selectedYear,
    selectedSource,
  ]);

  const handleRetry = () => {
    void fetchExams({
      search: searchInput,
      topic: selectedTopic,
      subtopic: selectedSubtopic,
      durationMin:
        selectedDuration === 'standard'
          ? 46
          : selectedDuration === 'long'
            ? 91
            : undefined,
      durationMax:
        selectedDuration === 'short'
          ? 45
          : selectedDuration === 'standard'
            ? 90
            : undefined,
      difficulty: selectedDifficulty,
      year: selectedYear,
      source: selectedSource,
      initialLoad: !hasLoadedOnce,
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedTopic('');
    setSelectedSubtopic('');
    setSelectedDuration('all');
    setSelectedDifficulty('');
    setSelectedYear('');
    setSelectedSource('');
  };

  if (loading) {
    return <ExamListSkeleton />;
  }

  if (error && !hasLoadedOnce) {
    return <ExamListError message={error} onRetry={handleRetry} />;
  }

  if (
    exams.length === 0 &&
    !searchInput &&
    !selectedTopic &&
    !selectedSubtopic &&
    selectedDuration === 'all' &&
    !selectedDifficulty &&
    !selectedYear &&
    !selectedSource
  ) {
    return <ExamListEmpty onRetry={handleRetry} />;
  }

  return (
    <ExamList
      exams={exams}
      stats={stats}
      draftExamId={draftExamId}
      searchInput={searchInput}
      selectedTopic={selectedTopic}
      selectedSubtopic={selectedSubtopic}
      selectedDuration={selectedDuration}
      selectedDifficulty={selectedDifficulty}
      selectedYear={selectedYear}
      selectedSource={selectedSource}
      topics={topics}
      listError={error}
      topicsError={topicsError}
      isFiltering={isFiltering}
      onSearchChange={setSearchInput}
      onTopicChange={(value) => {
        setSelectedTopic(value);
        setSelectedSubtopic('');
      }}
      onSubtopicChange={setSelectedSubtopic}
      onDurationChange={setSelectedDuration}
      onDifficultyChange={setSelectedDifficulty}
      onYearChange={setSelectedYear}
      onSourceChange={setSelectedSource}
      onClearFilters={handleClearFilters}
    />
  );
}
