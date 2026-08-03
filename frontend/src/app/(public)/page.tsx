export default function PublicHomePage() {
  return (
    <main id="main-content" className="flex-1 text-text-primary">
      <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold text-primary">Luyện đề Toán THPT</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-[-0.035em] sm:text-5xl sm:leading-[1.08] lg:text-6xl">
            Luyện đề Toán như một buổi thi thật.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
            Chọn đề, làm bài có bấm giờ, xem lại đáp án và biết chuyên đề nào cần ôn tiếp.
          </p>
        </div>
      </section>

      <section id="cach-hoat-dong" className="border-t border-border px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-xl text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Một vòng luyện tập rõ ràng.</h2>
          <p className="mt-4 max-w-2xl leading-7 text-text-secondary">Chọn đề, làm trong thời gian và xem lại những phần cần ôn tiếp.</p>
        </div>
      </section>

      <section id="ket-qua" className="border-t border-border px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-xl text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Kết quả để định hướng lần làm tiếp theo.</h2>
          <p className="mt-4 max-w-2xl leading-7 text-text-secondary">Xem điểm, đáp án và các chuyên đề cần được chú ý sau khi nộp bài.</p>
        </div>
      </section>
    </main>
  );
}
