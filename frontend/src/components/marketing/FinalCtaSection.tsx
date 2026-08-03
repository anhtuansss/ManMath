import Link from 'next/link';

export function FinalCtaSection() {
  return (
    <section className="border-t border-border px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-primary/20 bg-primary-light px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:py-11">
        <svg aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-64 text-primary/15" viewBox="0 0 256 160" fill="none">
          <path d="M20 132H244M54 150V16" stroke="currentColor" strokeWidth="1" />
          <path d="M30 118C72 72 108 42 142 68C178 96 194 36 236 24" stroke="currentColor" strokeWidth="1.5" />
          <path d="M134 16L236 146" stroke="currentColor" strokeDasharray="5 7" />
        </svg>
        <div className="relative max-w-xl">
          <h2 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Sẵn sàng bắt đầu một đề Toán?</h2>
          <p className="mt-3 leading-7 text-text-secondary">Chọn một đề phù hợp và bắt đầu lượt luyện tập của bạn.</p>
        </div>
        <div className="relative mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0">
          <Link href="/dashboard" className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Bắt đầu luyện đề
          </Link>
          <Link href="/exam/tong-hop-van-dung-cao" className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Xem đề mẫu
          </Link>
        </div>
      </div>
    </section>
  );
}
