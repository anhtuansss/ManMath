"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchProtectedJson,
  getCurrentUser,
  isUnauthorizedError,
} from "../../lib/authApi";
import { subscribeAuthTokenChange } from "../../lib/authStorage";
import { getExamTakingHref } from "../../lib/examRoutes";
import type {
  ProgressResponse,
  ProgressSummary,
  RecommendationsResponse,
  RecommendationWeakTopic,
  RecommendedExam,
  TopicStatsResponse,
  TopicStatDto,
} from "../../lib/apiTypes";

type AnalyticsStatus = "loading" | "unauthorized" | "ready" | "error";
const PROFILE_TARGET_ATTEMPTS = 3;
const EMPTY_PROGRESS_SUMMARY: ProgressSummary = {
  attemptCount: 0,
  averageScore: 0,
  bestScore: 0,
  latestScore: null,
};
const clamp = (value: number) => Math.min(Math.max(value, 0), 100);
const performance = (topic: TopicStatDto) =>
  topic.masteryPercentage ?? topic.accuracy;

type CapabilityScore = {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly topicSlugs: readonly string[];
  readonly correct: number;
  readonly total: number;
  readonly percentage: number;
};

const CAPABILITY_GROUPS: readonly Omit<CapabilityScore, 'correct' | 'total' | 'percentage'>[] = [
  {
    key: "functions",
    label: "Hàm số",
    description: "Hàm số và ứng dụng đạo hàm",
    topicSlugs: ["ham-so-va-do-thi-nen-tang", "dao-ham-va-khao-sat-ham-so"],
  },
  {
    key: "exponential-log",
    label: "Mũ – Logarit",
    description: "Lũy thừa, mũ và logarit",
    topicSlugs: ["luy-thua-mu-va-logarit"],
  },
  {
    key: "calculus",
    label: "Tích phân",
    description: "Nguyên hàm, tích phân và ứng dụng",
    topicSlugs: ["nguyen-ham-tich-phan-va-ung-dung"],
  },
  {
    key: "coordinate-geometry",
    label: "Oxyz",
    description: "Vectơ và tọa độ trong không gian Oxyz",
    topicSlugs: ["vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz"],
  },
  {
    key: "geometry",
    label: "Hình không gian",
    description: "Hình học không gian và khối tròn xoay",
    topicSlugs: ["hinh-hoc-khong-gian", "khoi-tron-xoay"],
  },
  {
    key: "probability-statistics",
    label: "Xác suất – Thống kê",
    description: "Xác suất, tổ hợp và thống kê",
    topicSlugs: ["xac-suat-va-to-hop", "thong-ke"],
  },
] as const;

const aggregateCapabilityScores = (topics: TopicStatDto[]): CapabilityScore[] =>
  CAPABILITY_GROUPS.map((group) => {
    const matching = topics.filter(
      (topic) =>
        topic.topicSlug !== null && group.topicSlugs.includes(topic.topicSlug),
    );
    const correct = matching.reduce((sum, topic) => sum + topic.correct, 0);
    const total = matching.reduce((sum, topic) => sum + topic.total, 0);
    return {
      ...group,
      correct,
      total,
      percentage: total > 0 ? (correct / total) * 100 : 0,
    };
  });

function MetricIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
      {children}
    </span>
  );
}

function RadarChart({ groups }: { groups: CapabilityScore[] }) {
  const size = 420;
  const center = size / 2;
  const radius = 108;
  const pointAt = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / groups.length;
    return {
      x: center + Math.cos(angle) * radius * value,
      y: center + Math.sin(angle) * radius * value,
    };
  };
  const polygon = (value: number) =>
    groups
      .map((_, index) => {
        const point = pointAt(index, value);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  const values = groups
    .map((group, index) => {
      const point = pointAt(index, group.percentage / 100);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full"
        role="img"
        aria-label="Chỉ số năng lực sơ bộ theo sáu nhóm năng lực"
      >
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={polygon(level)}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-border"
          />
        ))}
        {groups.map((_, index) => {
          const point = pointAt(index, 1);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border"
            />
          );
        })}
        <polygon
          points={values}
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
        {groups.map((group, index) => {
          const point = pointAt(index, group.percentage / 100);
          const label = pointAt(index, 1.42);
          return (
            <g key={group.key}>
              <title>
                {group.total > 0
                  ? `${group.description}: ${group.correct}/${group.total} câu đúng (${Math.round(group.percentage)}%)`
                  : `${group.description}: Chưa có dữ liệu`}
              </title>
              <circle
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill="currentColor"
                className="text-primary"
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: "var(--color-text-secondary)", fontSize: 13 }}
              >
                {group.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="workspace-metadata -mt-1 text-center">
        Chỉ số sơ bộ dựa trên kết quả các câu bạn đã làm.
      </p>
    </div>
  );
}

export function AnalyticsClient() {
  const [status, setStatus] = useState<AnalyticsStatus>("loading");
  const [topicStats, setTopicStats] = useState<TopicStatDto[]>([]);
  const [summary, setSummary] = useState<ProgressSummary>(
    EMPTY_PROGRESS_SUMMARY,
  );
  const [latestAccuracy, setLatestAccuracy] = useState<number | null>(null);
  const [recommendedExams, setRecommendedExams] = useState<RecommendedExam[]>(
    [],
  );
  const [weakTopics, setWeakTopics] = useState<RecommendationWeakTopic[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const reset = () => {
      setTopicStats([]);
      setSummary(EMPTY_PROGRESS_SUMMARY);
      setLatestAccuracy(null);
      setRecommendedExams([]);
      setWeakTopics([]);
    };
    const load = async () => {
      try {
        setStatus("loading");
        setErrorMessage(null);
        const user = await getCurrentUser();
        if (!mounted) return;
        if (!user) {
          reset();
          setStatus("unauthorized");
          return;
        }
        const [topics, progress, recommendations] = await Promise.allSettled([
          fetchProtectedJson<TopicStatsResponse>("/api/me/topic-stats"),
          fetchProtectedJson<ProgressResponse>("/api/me/progress"),
          fetchProtectedJson<RecommendationsResponse>(
            "/api/me/recommendations",
          ),
        ]);
        if (!mounted) return;
        if (
          [topics, progress, recommendations].some(
            (result) =>
              result.status === "rejected" &&
              isUnauthorizedError(result.reason),
          )
        ) {
          reset();
          setStatus("unauthorized");
          return;
        }
        if (topics.status === "rejected") throw topics.reason;
        if (progress.status === "rejected") throw progress.reason;
        setTopicStats(
          Array.isArray(topics.value.topicStats) ? topics.value.topicStats : [],
        );
        setSummary(progress.value.summary ?? EMPTY_PROGRESS_SUMMARY);
        const last = progress.value.recentAttempts?.[0];
        setLatestAccuracy(
          last && last.totalQuestions > 0
            ? Math.round((last.correctCount / last.totalQuestions) * 100)
            : null,
        );
        if (recommendations.status === "fulfilled") {
          setRecommendedExams(
            Array.isArray(recommendations.value.recommendedExams)
              ? recommendations.value.recommendedExams
              : [],
          );
          setWeakTopics(
            Array.isArray(recommendations.value.weakTopics)
              ? recommendations.value.weakTopics
              : [],
          );
        } else {
          setRecommendedExams([]);
          setWeakTopics([]);
        }
        setStatus("ready");
      } catch (error: unknown) {
        if (!mounted) return;
        if (isUnauthorizedError(error)) {
          reset();
          setStatus("unauthorized");
          return;
        }
        setErrorMessage("Không tải được phân tích học tập. Hãy thử lại sau.");
        setStatus("error");
      }
    };
    void load();
    const unsubscribe = subscribeAuthTokenChange(() => {
      void load();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  const capabilityScores = useMemo(
    () => aggregateCapabilityScores(topicStats),
    [topicStats],
  );
  const priorityTopics = useMemo(() => {
    const recommended = weakTopics
      .filter((topic) => topic.total > 0)
      .slice(0, 3);
    return recommended.length
      ? recommended
      : [...topicStats]
          .filter((topic) => topic.total > 0)
          .sort((a, b) => performance(a) - performance(b))
          .slice(0, 3)
          .map((topic) => ({
            ...topic,
            reason: "Dữ liệu hiện có cho thấy đây là một chuyên đề cần chú ý.",
          }));
  }, [topicStats, weakTopics]);
  const nextExam = recommendedExams[0] ?? null;
  const complete = Math.min(summary.attemptCount, PROFILE_TARGET_ATTEMPTS);
  const profilePercent = (complete / PROFILE_TARGET_ATTEMPTS) * 100;
  const metrics = [
    ["Bài đã làm", summary.attemptCount, "▤"],
    [
      "Tỷ lệ đúng gần đây",
      latestAccuracy === null ? "--" : `${latestAccuracy}%`,
      "◎",
    ],
    ["Dữ liệu phân tích", `${complete} / ${PROFILE_TARGET_ATTEMPTS}`, "▥"],
    [
      "Điểm tốt nhất",
      summary.attemptCount ? summary.bestScore.toFixed(1) : "--",
      "★",
    ],
  ];
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-[100dvh] bg-background px-4 py-7 text-text-primary sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-[1100px] animate-fade-in flex-col gap-5">
        <header className="pb-1">
          <h1 className="workspace-page-title text-text-primary">
            Tổng quan học tập
          </h1>
          <p className="workspace-page-description mt-2">
            Xem điểm mạnh, phần cần ôn và xu hướng từ các lần làm gần đây.
          </p>
        </header>
        {status === "loading" && (
          <>
            <section className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
            <div className="grid gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[88px] animate-pulse rounded-xl border border-border bg-surface"
                />
              ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="h-[360px] animate-pulse rounded-xl border border-border bg-surface" />
              <section className="h-[360px] animate-pulse rounded-xl border border-border bg-surface" />
            </div>
          </>
        )}
        {status === "unauthorized" && (
          <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
            <h2 className="workspace-section-title text-text-primary">
              Bạn cần đăng nhập để xem phân tích học tập.
            </h2>
            <p className="workspace-page-description mx-auto mt-2 max-w-md">
              Đăng nhập ở trang luyện đề để xem tiến độ và các đề được gợi ý.
            </p>
            <Link
              href="/dashboard"
              className="workspace-button-text mt-6 inline-flex h-10 rounded-lg bg-primary px-5 text-white hover:bg-primary-hover"
            >
              Về trang luyện đề
            </Link>
          </section>
        )}
        {status === "error" && (
          <section className="rounded-xl border border-error-border bg-surface p-6 shadow-card">
            <h2 className="workspace-section-title text-error">
              Không tải được analytics
            </h2>
            <p className="workspace-page-description mt-2">{errorMessage}</p>
          </section>
        )}
        {status === "ready" && (
          <>
            <section className="grid gap-4 rounded-xl border border-border bg-surface p-4 shadow-card sm:grid-cols-[minmax(0,1fr)_minmax(220px,.7fr)] sm:items-center sm:p-5">
              <div className="flex items-center gap-3">
                <MetricIcon>
                  <span aria-hidden="true">▥</span>
                </MetricIcon>
                <div className="min-w-0 flex-1">
                  <h2 className="workspace-item-title text-text-primary">
                    Hồ sơ năng lực đang được xây dựng
                  </h2>
                  <p className="workspace-metadata mt-1">
                    {complete}/{PROFILE_TARGET_ATTEMPTS} bài hoàn thành
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background-alt">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${profilePercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="border-t border-border pt-3 text-sm leading-5 text-text-secondary sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                {summary.attemptCount < PROFILE_TARGET_ATTEMPTS
                  ? `Cần thêm ${PROFILE_TARGET_ATTEMPTS - summary.attemptCount} bài để mở phân tích xu hướng đáng tin cậy.`
                  : "Đã có đủ dữ liệu cơ bản để xem tiến độ học tập."}
              </p>
            </section>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(([label, value, icon]) => (
                <article
                  key={String(label)}
                  className="flex min-h-[88px] items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card"
                >
                  <MetricIcon>
                    <span aria-hidden="true">{icon}</span>
                  </MetricIcon>
                  <div>
                    <p className="workspace-metadata">{label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
                      {value}
                    </p>
                  </div>
                </article>
              ))}
            </section>
            <section className="grid gap-5 lg:grid-cols-2">
              <article className="min-h-[360px] rounded-xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <h2 className="workspace-section-title text-text-primary">
                    Chỉ số năng lực
                  </h2>
                  <span
                    className="text-text-muted"
                    title="Chỉ số sơ bộ, không phải đánh giá năng lực tuyệt đối."
                    aria-label="Thông tin về chỉ số năng lực"
                  >
                    ⓘ
                  </span>
                </div>
                <RadarChart groups={capabilityScores} />
              </article>
              <article className="flex min-h-[360px] flex-col rounded-xl border border-border bg-surface p-5 shadow-card">
                <h2 className="workspace-section-title text-text-primary">
                  Đề xuất cho bạn
                </h2>
                {recommendedExams.length ? (
                  <div className="mt-4 divide-y divide-border border-y border-border">
                    {recommendedExams.slice(0, 3).map((exam) => (
                      <Link
                        key={exam.examId}
                        href={getExamTakingHref(exam.examId)}
                        className="flex items-center gap-3 py-3 hover:text-primary"
                      >
                        <MetricIcon>
                          <span aria-hidden="true">◎</span>
                        </MetricIcon>
                        <span className="min-w-0 flex-1">
                          <span className="workspace-item-title block truncate text-text-primary">
                            {exam.title}
                          </span>
                          <span className="workspace-metadata mt-1 block">
                            {exam.durationMinutes} phút
                          </span>
                        </span>
                        <span className="text-text-muted" aria-hidden="true">
                          ›
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="workspace-page-description mt-5">
                    Hoàn thành thêm đề để ManMath đưa ra gợi ý phù hợp hơn.
                  </p>
                )}
                <Link
                  href={
                    nextExam ? getExamTakingHref(nextExam.examId) : "/dashboard"
                  }
                  className="workspace-button-text mt-auto inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-white hover:bg-primary-hover"
                >
                  {nextExam ? "Làm bài ngay" : "Chọn một đề"}{" "}
                  <span className="ml-2" aria-hidden="true">
                    →
                  </span>
                </Link>
              </article>
            </section>
            <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="workspace-section-title text-text-primary">
                  Chuyên đề cần chú ý
                </h2>
              </div>
              {priorityTopics.length ? (
                <div className="divide-y divide-border">
                  {priorityTopics.map((topic) => {
                    const accuracy = clamp(performance(topic));
                    const state =
                      topic.total < 3
                        ? "Cần thêm dữ liệu"
                        : accuracy < 60
                          ? "Cần ôn"
                          : "Đang củng cố";
                    return (
                      <div
                        key={topic.topicId ?? topic.topicName}
                        className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_72px_130px_112px_64px] md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="workspace-item-title truncate text-text-primary">
                            {topic.topicName}
                          </p>
                          <p className="workspace-metadata mt-1">
                            {topic.reason}
                          </p>
                        </div>
                        <span className="workspace-metadata">
                          {topic.correct}/{topic.total}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background-alt">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>
                          <span className="workspace-badge-text text-text-secondary">
                            {accuracy}%
                          </span>
                        </div>
                        <span
                          className={`workspace-badge-text w-fit rounded-md px-2 py-1 ${accuracy < 60 ? "bg-warning-light text-warning" : "bg-primary-50 text-primary"}`}
                        >
                          {state}
                        </span>
                        {topic.topicSlug ? (
                          <Link
                            href={`/practice/topic/${topic.topicSlug}`}
                            className="workspace-button-text text-primary hover:text-primary-hover"
                          >
                            Luyện →
                          </Link>
                        ) : (
                          <span className="workspace-metadata">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="workspace-page-description px-5 py-8">
                  Chưa có đủ dữ liệu theo chuyên đề để hiển thị phần cần chú ý.
                </p>
              )}
              <div className="border-t border-border px-5 py-3 text-center">
                <Link
                  href="/dashboard"
                  className="workspace-button-text text-primary hover:text-primary-hover"
                >
                  Làm thêm đề để mở rộng phân tích →
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
