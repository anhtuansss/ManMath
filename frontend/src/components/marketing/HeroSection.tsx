import { LandingAuthActions } from './LandingAuthActions';
import { MathProductVisual } from './MathProductVisual';

export function HeroSection() {
  return (
    <section className="overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-16">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12 lg:gap-4 xl:gap-8">
        <div className="lg:col-span-5 lg:pr-4">
          <p className="text-sm font-semibold text-primary">Luyện đề Toán THPT</p>
          <h1 className="mt-4 max-w-[470px] text-balance text-[42px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[50px] lg:text-[54px] lg:leading-[1.02]">
            Luyện đề Toán như một buổi thi thật.
          </h1>
          <p className="mt-6 max-w-[30rem] text-[17px] leading-7 text-text-secondary sm:text-lg sm:leading-8">
            Chọn đề, làm bài có bấm giờ, xem lại đáp án và biết chuyên đề nào cần ôn tiếp.
          </p>
          <LandingAuthActions className="mt-8" />
          <p className="mt-4 max-w-[32rem] text-sm leading-6 text-text-secondary">
            Có thể làm đề ngay. Đăng nhập khi muốn lưu lịch sử và xem phân tích cá nhân.
          </p>
        </div>

        <div className="lg:col-span-7 lg:pl-4 xl:pl-6">
          <MathProductVisual />
        </div>
      </div>
    </section>
  );
}
