import Link from 'next/link';

export function FinalCtaSection() {
  return (
    <section className="border-t border-border px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="relative isolate mx-auto grid max-w-7xl gap-7 overflow-hidden rounded-2xl border border-primary/20 bg-primary-light px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12 lg:px-12">
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Sẵn sàng bắt đầu một đề Toán?</h2>
          <p className="mt-3 leading-7 text-text-secondary">Chọn một đề phù hợp và bắt đầu lượt luyện tập của bạn.</p>
        </div>
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row lg:justify-self-end">
          <Link href="/dashboard" className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-primary-hover active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Bắt đầu luyện đề
          </Link>
          <Link href="/exam/tong-hop-van-dung-cao" className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-[background-color,transform] duration-150 hover:bg-background-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Xem đề mẫu
          </Link>
        </div>
      </div>
    </section>
  );
}
