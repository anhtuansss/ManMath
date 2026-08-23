'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearAuthToken } from '../../lib/authStorage';
import { getCurrentUser, type AuthUser } from '../../lib/authApi';

export function ProfileClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { void getCurrentUser().then(setUser); }, []);
  if (user === null) return <main className="p-8"><h1 className="workspace-page-title">Hồ sơ</h1><p className="workspace-page-description mt-2">Bạn cần đăng nhập để xem hồ sơ học tập.</p><Link className="workspace-button-text mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-white" href="/dashboard">Về dashboard</Link></main>;
  return <main className="mx-auto max-w-3xl p-6"><p className="workspace-eyebrow">Tài khoản</p><h1 className="workspace-page-title mt-1">Hồ sơ của bạn</h1><section className="mt-6 rounded-xl border border-border bg-surface p-6 shadow-card"><p className="text-xl font-semibold">{user.fullName ?? 'Người dùng ManMath'}</p><p className="workspace-metadata mt-2">{user.email}</p><div className="mt-6 flex flex-wrap gap-3"><Link className="workspace-button-text rounded-lg bg-primary px-4 py-2 text-white" href="/dashboard">Xem tiến độ</Link><Link className="workspace-button-text rounded-lg border border-border px-4 py-2" href="/history">Lịch sử đề</Link><button className="workspace-button-text rounded-lg border border-border px-4 py-2" onClick={() => { clearAuthToken(); setUser(null); }}>Đăng xuất</button></div></section></main>;
}
