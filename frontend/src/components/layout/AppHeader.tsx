import { AuthButton } from '../auth/AuthButton';
import Link from 'next/link';
import { Logo } from '../exam/Logo';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Mobile left side (Logo) */}
      <div className="flex items-center lg:hidden">
        <Link href="/dashboard" className="group flex items-center gap-2" aria-label="ManMath workspace">
          <Logo className="h-6 w-6 transition-transform group-hover:scale-105" />
          <span className="font-semibold text-text-primary transition-colors group-hover:text-primary">
            ManMath
          </span>
        </Link>
      </div>

      <div className="hidden flex-1 lg:block" />

      {/* Right side (Auth) */}
      <div className="flex items-center gap-4">
        <AuthButton />
      </div>
    </header>
  );
}
