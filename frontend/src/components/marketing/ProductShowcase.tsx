import Image from 'next/image';
import Link from 'next/link';

export function ProductShowcase() {
  return (
    <section id="ket-qua" className="border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-4">
            <h2 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Làm đề, xem lại và đi tiếp.</h2>
            <p className="mt-4 max-w-md leading-7 text-text-secondary">ManMath giữ luồng luyện đề trong một nơi: tập trung khi làm bài, rồi xem điểm, đáp án và chuyên đề cần ôn tiếp.</p>
            <ul className="mt-6 space-y-3 border-t border-border pt-5 text-sm leading-6 text-text-secondary">
              <li><span className="font-semibold text-text-primary">Trong lúc làm:</span> timer, đáp án và điều hướng câu hỏi.</li>
              <li><span className="font-semibold text-text-primary">Sau khi nộp:</span> điểm số, review đáp án và phân tích theo chuyên đề.</li>
            </ul>
            <Link href="/dashboard" className="mt-7 inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text-primary transition-colors hover:bg-background-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Vào kho đề
            </Link>
          </div>

          <figure className="overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-[0_14px_36px_rgba(15,23,42,0.07)] sm:p-3 lg:col-span-5">
            <div className="aspect-[16/10] overflow-hidden rounded-xl bg-background-alt">
              <Image
                src="/images/landing/exam-workspace.webp"
                alt="Màn làm đề ManMath hiển thị câu hỏi, đáp án và bảng điều hướng câu hỏi."
                width={1397}
                height={805}
                sizes="(max-width: 1023px) 100vw, 42vw"
                className="h-full max-w-none w-[calc(100%+14px)] object-cover object-left-top"
              />
            </div>
          </figure>

          <figure className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-[0_14px_36px_rgba(15,23,42,0.07)] sm:p-3 lg:col-span-3 lg:max-w-none">
            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-background-alt">
              <Image
                src="/images/landing/result-review.webp"
                alt="Trang kết quả ManMath với điểm số, phân tích chuyên đề và review đáp án."
                width={1878}
                height={2829}
                sizes="(max-width: 1023px) 88vw, 25vw"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <figcaption className="px-1 pb-0.5 pt-3 text-xs leading-5 text-text-secondary">Ví dụ giao diện từ một lượt làm thử.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
