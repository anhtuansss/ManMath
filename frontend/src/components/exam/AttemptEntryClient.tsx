'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../config/api';
import { getAuthToken } from '../../lib/authStorage';
import type { V2AttemptReceiptDto } from '../exam-v2/types';
import { AttemptDetailClient } from './AttemptDetailClient';

export function AttemptEntryClient({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [isCheckingV2, setIsCheckingV2] = useState(true);

  useEffect(() => {
    let active = true;
    const token = getAuthToken();
    if (!token) {
      setIsCheckingV2(false);
      return;
    }

    const checkV2 = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v2/attempts/${encodeURIComponent(attemptId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const receipt = await response.json() as V2AttemptReceiptDto;
        router.replace(`/exam-v2/${receipt.examId}/result?attemptId=${encodeURIComponent(attemptId)}`);
      } finally {
        if (active) setIsCheckingV2(false);
      }
    };
    void checkV2();
    return () => { active = false; };
  }, [attemptId, router]);

  if (isCheckingV2) {
    return <main className="min-h-[100dvh] bg-background px-4 py-8"><div className="mx-auto h-48 max-w-4xl animate-pulse rounded-xl border border-border bg-surface" /></main>;
  }

  return <AttemptDetailClient attemptId={attemptId} />;
}
