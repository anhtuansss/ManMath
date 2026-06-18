'use client';

import { usePathname } from 'next/navigation';
import { AuthButton } from '../auth/AuthButton';
import Link from 'next/link';
import { Logo } from '../exam/Logo';

export function AppHeader() {
  const pathname = usePathname();

  // Hide on focus-mode pages
  if (
    pathname.startsWith('/exam/') ||
    pathname.startsWith('/attempts/') ||
    pathname.startsWith('/practice/topic/')
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Mobile left side (Logo) */}
      <div className="flex items-center lg:hidden">
        <Link href="/" className="group flex items-center gap-2" aria-label="ManMath Home">
          <Logo className="h-6 w-6 transition-transform group-hover:scale-105" />
          <span className="font-[family-name:var(--font-outfit)] font-bold text-text-primary transition-colors group-hover:text-primary">
            ManMath
          </span>
        </Link>
      </div>

      {/* Desktop left side (Search bar placeholder or empty) */}
      <div className="hidden flex-1 items-center lg:flex">
        {/* We can add a search bar here later if needed */}
      </div>

      {/* Right side (Auth) */}
      <div className="flex items-center gap-4">
        <AuthButton />
      </div>
    </header>
  );
}
