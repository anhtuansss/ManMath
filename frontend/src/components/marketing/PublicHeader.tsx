import Link from 'next/link';
import { Logo } from '../exam/Logo';
import { LandingAuthActions } from './LandingAuthActions';

export function PublicHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label="ManMath trang chủ">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-bold tracking-[-0.02em] text-text-primary">ManMath</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-text-secondary md:flex" aria-label="Điều hướng landing">
          <Link href="/#cach-hoat-dong" className="rounded-sm transition-colors hover:text-text-primary">Cách hoạt động</Link>
          <Link href="/#ket-qua" className="rounded-sm transition-colors hover:text-text-primary">Kết quả</Link>
          <Link href="/about" className="rounded-sm transition-colors hover:text-text-primary">Về ManMath</Link>
        </nav>

        <LandingAuthActions showSecondary={false} />
      </div>
    </header>
  );
}
