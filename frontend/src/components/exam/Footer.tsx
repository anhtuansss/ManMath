import Link from 'next/link';
import { Logo } from './Logo';
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-[family-name:var(--font-outfit)] text-sm font-bold text-text-primary">
            ManMath
          </span>
        </div>
        
        <div className="text-xs text-text-secondary">
          &copy; {new Date().getFullYear()} ManMath. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
