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

      {/* Desktop search affordance links to the working search in the exam list. */}
      <div className="hidden flex-1 items-center lg:flex">
        <Link
          href="/dashboard#exam-library"
          className="ml-auto mr-6 flex h-10 w-full max-w-[340px] items-center rounded-lg border border-border bg-surface px-3 text-sm text-text-muted transition-colors hover:border-primary/30 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <svg className="mr-2 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" /></svg>
          Tìm đề thi, trường, chuyên đề...
        </Link>
      </div>

      {/* Right side (Auth) */}
      <div className="flex items-center gap-4">
        <AuthButton />
      </div>
    </header>
  );
}
