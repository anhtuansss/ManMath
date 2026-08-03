'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../exam/Logo';
import { AuthButton } from '../auth/AuthButton';

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function ChartBarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Luyện đề', icon: HomeIcon, aliases: ['/exams'] },
    { href: '/analytics', label: 'Phân tích', icon: ChartBarIcon },
    { href: '/history', label: 'Lịch sử', icon: ClockIcon },
    { href: '/profile', label: 'Hồ sơ', icon: UserIcon },
  ];

  return (
    <>
      <aside className="sticky top-0 z-40 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 shrink-0 items-center px-6">
          <Link href="/dashboard" className="group flex items-center gap-3" aria-label="ManMath workspace">
            <Logo className="h-7 w-7 transition-transform group-hover:scale-105" />
            <span className="font-[family-name:var(--font-outfit)] text-xl font-bold tracking-tight text-text-primary transition-colors group-hover:text-primary">
              ManMath
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {links.map((link) => {
            const isActive = pathname === link.href || link.aliases?.includes(pathname);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-background-alt hover:text-text-primary'
                  }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-surface/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {links.map((link) => {
          const isActive = pathname === link.href || link.aliases?.includes(pathname);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${isActive
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
