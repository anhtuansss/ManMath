import Link from 'next/link';
import { Logo } from '../exam/Logo';

export function PublicFooter() {
  return (
    <footer className="border-t border-border px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex w-fit items-center gap-2.5 rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <Logo className="h-6 w-6" />
          <span className="font-semibold">ManMath</span>
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Liên kết chân trang">
          <Link href="/about" className="rounded-sm hover:text-text-primary">Về ManMath</Link>
          <Link href="/dashboard" className="rounded-sm hover:text-text-primary">Luyện đề</Link>
          <a href="https://github.com/anhtuansss/manmath" target="_blank" rel="noreferrer" className="rounded-sm hover:text-text-primary">GitHub</a>
        </nav>
      </div>
    </footer>
  );
}
