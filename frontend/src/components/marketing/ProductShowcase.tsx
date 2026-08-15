import Image from 'next/image';

export function ProductShowcase() {
  return (
    <section id="ket-qua" className="relative overflow-hidden border-t border-border bg-primary-50/35 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_center,rgba(191,219,254,0.42),transparent_68%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="order-2 lg:order-1 lg:col-span-7">
            <figure className="relative overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-[0_24px_56px_rgba(15,23,42,0.09),0_5px_16px_rgba(37,99,235,0.08)] sm:p-3">
              <div aria-hidden="true" className="absolute inset-x-10 -top-px h-px bg-primary/45" />
              <div className="aspect-[16/10] overflow-hidden rounded-xl bg-background-alt">
                <Image
                  src="/images/landing/exam-workspace.webp"
                  alt="Màn làm đề ManMath hiển thị câu hỏi, lựa chọn đáp án, đồng hồ và bảng điều hướng câu hỏi."
                  width={1868}
                  height={944}
                  sizes="(min-width: 1280px) 720px, (min-width: 1024px) 56vw, (min-width: 640px) 88vw, 100vw"
                  className="h-full w-full object-cover object-left-top"
                />
              </div>
            </figure>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-5 lg:pl-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-primary">PRODUCT PROOF</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Làm đề, xem lại và đi tiếp.</h2>
            <p className="mt-4 max-w-md leading-7 text-text-secondary">ManMath giữ luồng luyện đề trong một nơi: tập trung khi làm bài, rồi xem điểm, đáp án và chuyên đề cần ôn tiếp.</p>
            <ul className="mt-6 space-y-4 border-t border-border pt-5 text-sm leading-6 text-text-secondary">
              <li><span className="font-semibold text-text-primary">Trong lúc làm:</span> timer, đáp án và điều hướng câu hỏi.</li>
              <li><span className="font-semibold text-text-primary">Sau khi nộp:</span> điểm số, review đáp án và phân tích theo chuyên đề.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
