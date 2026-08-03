import Image from 'next/image';

export function MathProductVisual() {
  return (
    <div className="relative mx-auto w-full max-w-3xl lg:max-w-none">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -top-8 hidden h-48 w-64 text-primary/25 lg:block"
        viewBox="0 0 256 192"
        fill="none"
      >
        <path d="M16 160H238M56 176V18" stroke="currentColor" strokeWidth="1.25" />
        <path d="M28 142C72 88 96 56 128 56C164 56 180 118 228 30" stroke="currentColor" strokeWidth="2" />
        <path d="M84 18L222 176" stroke="currentColor" strokeWidth="1" strokeDasharray="5 7" />
        <circle cx="128" cy="56" r="4" fill="currentColor" />
      </svg>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-3">
        <div className="aspect-[16/9] overflow-hidden rounded-xl bg-background-alt">
          <Image
            src="/images/landing/exam-workspace.webp"
            alt="Giao diện làm đề ManMath với đồng hồ, câu hỏi, đáp án và điều hướng câu hỏi."
            width={1424}
            height={805}
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 88vw, 58vw"
            className="h-full max-w-none w-[calc(100%+14px)] object-cover object-left-top"
          />
        </div>
      </div>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -left-7 h-24 w-40 text-primary/30"
        viewBox="0 0 160 96"
        fill="none"
      >
        <path d="M12 78L144 18M12 18L144 78" stroke="currentColor" strokeWidth="1.25" />
        <path d="M80 8V88M8 48H152" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}
