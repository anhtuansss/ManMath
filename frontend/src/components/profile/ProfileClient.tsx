'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserTopicStatsCard } from '../exam/UserTopicStatsCard';
import { fetchProtectedJson, getCurrentUser, isUnauthorizedError, type AuthUser } from '../../lib/authApi';
import { clearAuthToken, subscribeAuthTokenChange } from '../../lib/authStorage';
import type { ProgressResponse, RecentAttempt, RecommendationsResponse, RecommendedExam } from '../../lib/apiTypes';

type ProfileStatus = 'loading' | 'unauthorized' | 'ready' | 'error';

const formatSubmittedAt = (submittedAt: string): string => new Date(submittedAt).toLocaleString('vi-VN', {
  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
});

export function ProfileClient() {
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recommendedExam, setRecommendedExam] = useState<RecommendedExam | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);

  useEffect(() => {
    let isMounted = true;
    const resetProfile = () => {
      setRecommendedExam(null);
      setRecentAttempts([]);
    };
    const loadProfile = async () => {
      try {
        setStatus('loading');
        setErrorMessage(null);
        const currentUser = await getCurrentUser();
        if (!isMounted) return;
        if (!currentUser) {
          setUser(null);
          resetProfile();
          setStatus('unauthorized');
          return;
        }
        setUser(currentUser);
        resetProfile();
        const [recommendationResult, progressResult] = await Promise.allSettled([
          fetchProtectedJson<RecommendationsResponse>('/api/me/recommendations'),
          fetchProtectedJson<ProgressResponse>('/api/me/progress'),
        ]);
        if (!isMounted) return;
        const hasUnauthorized = [recommendationResult, progressResult]
          .some((result) => result.status === 'rejected' && isUnauthorizedError(result.reason));
        if (hasUnauthorized) {
          setUser(null);
          resetProfile();
          setStatus('unauthorized');
          return;
        }
        setRecommendedExam(recommendationResult.status === 'fulfilled' && Array.isArray(recommendationResult.value.recommendedExams) ? recommendationResult.value.recommendedExams[0] ?? null : null);
        setRecentAttempts(progressResult.status === 'fulfilled' && Array.isArray(progressResult.value.recentAttempts) ? progressResult.value.recentAttempts.slice(0, 5) : []);
        setStatus('ready');
      } catch (error: unknown) {
        if (!isMounted) return;
        if (isUnauthorizedError(error)) {
          setUser(null);
          resetProfile();
          setStatus('unauthorized');
          setErrorMessage(null);
          return;
        }
        setErrorMessage('Không tải được hồ sơ. Hãy thử lại sau.');
        setStatus('error');
      }
    };
    void loadProfile();
    const unsubscribeAuthTokenChange = subscribeAuthTokenChange(() => { void loadProfile(); });
    return () => {
      isMounted = false;
      unsubscribeAuthTokenChange();
    };
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
    setRecommendedExam(null);
    setRecentAttempts([]);
    setStatus('unauthorized');
    setErrorMessage(null);
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl animate-fade-in flex-col gap-6">
        <header className="border-b border-border pb-5">
          <p className="workspace-eyebrow">Hồ sơ học tập</p>
          <h1 className="workspace-page-title mt-1 text-text-primary">{user?.fullName ?? 'Hồ sơ của bạn'}</h1>
          <p className="workspace-page-description mt-2">Quản lý tài khoản và xem nhanh hoạt động học gần đây.</p>
        </header>

        {status === 'loading' && <div className="grid gap-6 lg:grid-cols-12"><section className="h-56 animate-pulse rounded-xl border border-border bg-surface lg:col-span-7" /><section className="h-56 animate-pulse rounded-xl border border-border bg-surface lg:col-span-5" /><section className="h-64 animate-pulse rounded-xl border border-border bg-surface lg:col-span-7" /></div>}

        {status === 'unauthorized' && <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-card"><h2 className="workspace-section-title text-text-primary">Bạn cần đăng nhập để xem hồ sơ.</h2><p className="workspace-page-description mx-auto mt-2 max-w-md">Đăng nhập ở trang luyện đề để xem thông tin tài khoản và hoạt động đã lưu.</p><Link href="/dashboard" className="workspace-button-text mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Về trang luyện đề</Link></section>}

        {status === 'error' && <section className="rounded-xl border border-error-border bg-surface p-6 shadow-card"><h2 className="workspace-section-title text-error">Không tải được hồ sơ</h2><p className="workspace-page-description mt-2">{errorMessage}</p></section>}

        {status === 'ready' && user && <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-border bg-surface p-6 shadow-card lg:col-span-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {user.avatarUrl ? <img src={user.avatarUrl} alt={`Ảnh đại diện của ${user.fullName ?? user.email}`} className="h-20 w-20 rounded-full border border-border object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary">{(user.fullName ?? user.email).charAt(0).toUpperCase()}</div>}
              <div className="min-w-0 flex-1"><p className="workspace-eyebrow">Tài khoản đang hoạt động</p><h2 className="workspace-section-title mt-1 truncate text-text-primary">{user.fullName ?? 'Người dùng ManMath'}</h2><p className="workspace-metadata mt-2 break-words">{user.email}</p><p className="workspace-metadata mt-1">Đăng nhập bằng Google</p></div>
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row"><Link href="/dashboard" className="workspace-button-text inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Quay về kho đề</Link><Link href="/history" className="workspace-button-text inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-5 text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem lịch sử</Link><button type="button" onClick={handleLogout} className="workspace-button-text inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-5 text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Đăng xuất</button></div>
          </section>

          <aside className="rounded-xl border border-border bg-surface p-6 shadow-card lg:col-span-5"><p className="workspace-eyebrow">Bước tiếp theo</p><h2 className="workspace-section-title mt-1 text-text-primary">Đề nên làm tiếp</h2>{recommendedExam ? <><div className="mt-5 border-y border-border py-4"><p className="workspace-item-title text-text-primary">{recommendedExam.title}</p><p className="workspace-metadata mt-2">{recommendedExam.durationMinutes} phút</p><p className="workspace-metadata mt-3 line-clamp-3">{recommendedExam.reason}</p></div><Link href={`/exam/${recommendedExam.examId}`} className="workspace-button-text mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Làm đề này</Link></> : <><p className="workspace-page-description mt-5">Chưa có đề gợi ý riêng. Chọn một đề trong kho để tiếp tục luyện tập.</p><Link href="/dashboard" className="workspace-button-text mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-surface px-4 text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem kho đề</Link></>}<Link href="/analytics" className="workspace-button-text mt-4 inline-flex text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem thêm gợi ý</Link></aside>

          <section className="rounded-xl border border-border bg-surface shadow-card lg:col-span-7"><div className="flex flex-col gap-2 border-b border-border px-6 py-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="workspace-eyebrow">Hoạt động gần đây</p><h2 className="workspace-section-title mt-1 text-text-primary">Các lần làm gần nhất</h2></div><Link href="/history" className="workspace-button-text text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem toàn bộ lịch sử</Link></div>{recentAttempts.length === 0 ? <div className="px-6 py-6"><p className="workspace-item-title text-text-primary">Bạn chưa có hoạt động luyện đề.</p><p className="workspace-page-description mt-1">Làm một đề để bắt đầu lưu lịch sử và theo dõi kết quả.</p></div> : <div className="divide-y divide-border">{recentAttempts.map((attempt) => <article key={attempt.attemptId} className="px-6 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="workspace-item-title truncate text-text-primary">{attempt.examTitle}</p><p className="workspace-metadata mt-1">{formatSubmittedAt(attempt.submittedAt)} · {attempt.correctCount}/{attempt.totalQuestions} câu đúng</p></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className="workspace-item-title tabular-nums text-text-primary">{attempt.score.toFixed(1)} điểm</span><Link href={`/attempts/${attempt.attemptId}`} className="workspace-button-text text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Xem chi tiết</Link></div></div></article>)}</div>}</section>

          <aside className="lg:col-span-5"><UserTopicStatsCard /></aside>
        </div>}
      </div>
    </main>
  );
}
