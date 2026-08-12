const benefits = [
  ['01', 'Làm bài như thi thật', 'Timer và điều hướng câu hỏi giữ nhịp cho một lượt làm đề.'],
  ['02', 'Chấm điểm và xem lại', 'Đối chiếu đáp án và lời giải sau khi nộp bài.'],
  ['03', 'Biết phần nào cần ôn tiếp', 'Xem kết quả theo chuyên đề trước lượt làm tiếp theo.'],
] as const;

export function PracticeLoopSection() {
  return (
    <section id="cach-hoat-dong" className="border-t border-border px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="sr-only">Cách ManMath hỗ trợ mỗi lượt luyện đề</h2>
        <ol className="grid gap-7 md:grid-cols-3 md:gap-0">
          {benefits.map(([index, title, description]) => (
            <li key={index} className="max-w-sm md:px-8 md:first:pl-0 md:not-first:border-l md:not-last:border-border">
              <p className="text-xs font-semibold tabular-nums text-primary">{index}</p>
              <h3 className="mt-2 text-base font-bold tracking-[-0.015em]">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-text-secondary">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
