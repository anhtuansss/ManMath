import Link from 'next/link';
import { Logo } from '../exam/Logo';

export function PublicHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center px-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md sm:gap-2.5" aria-label="ManMath trang chủ">
          <Logo className="h-7 w-7" />
          <span className="text-base font-bold tracking-[-0.02em] text-text-primary sm:text-lg max-[359px]:hidden">ManMath</span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm font-medium text-text-secondary md:flex" aria-label="Điều hướng landing">
          <Link href="/#cach-hoat-dong" className="rounded-sm transition-colors hover:text-text-primary">Cách hoạt động</Link>
          <Link href="/#ket-qua" className="rounded-sm transition-colors hover:text-text-primary">Kết quả</Link>
          <Link href="/about" className="rounded-sm transition-colors hover:text-text-primary">Về ManMath</Link>
        </nav>
      </div>
    </header>
  );
}
