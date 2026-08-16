'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuthToken, subscribeAuthTokenChange } from '../../lib/authStorage';

type LandingAuthActionsProps = {
  className?: string;
  compact?: boolean;
};

export function LandingAuthActions({ className = '', compact = false }: LandingAuthActionsProps) {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const syncToken = () => setHasToken(getAuthToken() !== null);

    syncToken();
    return subscribeAuthTokenChange(syncToken);
  }, []);

  const primaryLabel = hasToken ? 'Vào trang luyện tập' : 'Bắt đầu luyện đề';
  const primarySizing = compact
    ? 'h-10 min-w-0 whitespace-nowrap px-3 text-[13px] sm:h-11 sm:min-w-[184px] sm:px-5 sm:text-sm'
    : 'h-11 min-w-[184px] px-5 text-sm';

  return (
    <div className={className}>
      <Link
        href="/dashboard"
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-primary font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-primary-hover active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${primarySizing}`}
      >
        {primaryLabel}
      </Link>
    </div>
  );
}
