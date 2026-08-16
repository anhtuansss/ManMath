const benefits = [
  ['Trong lúc làm', 'Làm bài như thi thật', 'Timer và điều hướng câu hỏi giữ nhịp cho một lượt làm đề'],
  ['Sau khi nộp', 'Chấm điểm và xem lại', 'Đối chiếu đáp án và lời giải sau khi nộp bài'],
  ['Lượt tiếp theo', 'Biết phần nào cần ôn tiếp', 'Xem kết quả theo chuyên đề trước lượt làm tiếp theo'],
] as const;

export function PracticeLoopSection() {
  return (
    <section id="cach-hoat-dong" className="border-t border-border px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="sr-only">Cách ManMath hỗ trợ mỗi lượt luyện đề</h2>
        <ol className="grid gap-0 md:grid-cols-3">
          {benefits.map(([stage, title, description], index) => (
            <li key={stage} className="relative max-w-sm py-4 pl-7 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:pl-0 md:not-first:border-l md:not-last:border-border">
              {index < benefits.length - 1 ? (
                <span aria-hidden="true" className="absolute bottom-[-1rem] left-1 top-[1.85rem] w-px bg-border md:hidden" />
              ) : null}
              <span aria-hidden="true" className="absolute left-0 top-[1.35rem] z-10 h-2 w-2 rounded-full bg-primary ring-4 ring-background md:hidden" />
              <p className="text-xs font-semibold text-primary">{stage}</p>
              <h3 className="mt-2 text-base font-bold tracking-[-0.015em]">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-text-secondary">{description}</p>
              {index < benefits.length - 1 ? (
                <span aria-hidden="true" className="absolute right-[-0.55rem] top-7 z-10 hidden bg-background px-1 text-sm text-primary/60 md:block">→</span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
