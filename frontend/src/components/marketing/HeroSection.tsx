import { LandingAuthActions } from './LandingAuthActions';
import { MathProductVisual } from './MathProductVisual';
import { TypeOnHeadline } from './TypeOnHeadline';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_85%_42%,rgba(219,234,254,0.68),transparent_42%)] px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-10">
        <div className="landing-hero-copy lg:col-span-5 lg:pr-3 xl:pr-6">
          <p className="text-sm font-semibold text-primary">Luyện đề Toán THPT</p>
          <TypeOnHeadline />
          <p className="mt-6 max-w-[32rem] text-[17px] leading-7 text-text-secondary sm:text-lg sm:leading-8">
            Chọn đề, làm bài có bấm giờ, xem lại đáp án và biết chuyên đề nào cần ôn tiếp
          </p>
          <LandingAuthActions className="mt-8" />
        </div>

        <div className="landing-hero-visual lg:col-span-7 lg:pl-1 xl:pl-3">
          <MathProductVisual />
        </div>
      </div>
    </section>
  );
}
