'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuthToken, subscribeAuthTokenChange } from '../../lib/authStorage';

type LandingAuthActionsProps = {
  className?: string;
  showSecondary?: boolean;
};

export function LandingAuthActions({
  className = '',
  showSecondary = true,
}: LandingAuthActionsProps) {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const syncToken = () => setHasToken(getAuthToken() !== null);

    syncToken();
    return subscribeAuthTokenChange(syncToken);
  }, []);

  const primaryLabel = hasToken ? 'Vào trang luyện tập' : 'Bắt đầu luyện đề';

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${className}`}>
      <Link
        href="/dashboard"
        className="inline-flex h-11 min-w-[184px] items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {primaryLabel}
      </Link>
      {showSecondary && (
        <Link
          href="#cach-hoat-dong"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Xem cách ManMath hoạt động
        </Link>
      )}
    </div>
  );
}
