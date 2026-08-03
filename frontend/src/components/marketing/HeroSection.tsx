import { LandingAuthActions } from './LandingAuthActions';
import { MathProductVisual } from './MathProductVisual';

export function HeroSection() {
  return (
    <section className="overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-16 lg:pt-14">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5">
          <p className="text-sm font-semibold text-primary">Luyện đề Toán THPT</p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold tracking-[-0.04em] sm:text-5xl sm:leading-[1.08] lg:text-[52px] lg:leading-[1.04]">
            Luyện đề Toán như một buổi thi thật.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
            Chọn đề, làm bài có bấm giờ, xem lại đáp án và biết chuyên đề nào cần ôn tiếp.
          </p>
          <LandingAuthActions className="mt-8" />
          <p className="mt-4 max-w-lg text-sm leading-6 text-text-secondary">
            Có thể làm đề ngay. Đăng nhập khi muốn lưu lịch sử và xem phân tích cá nhân.
          </p>
        </div>

        <div className="lg:col-span-7 lg:-mr-6 lg:pl-4">
          <MathProductVisual />
        </div>
      </div>
    </section>
  );
}
