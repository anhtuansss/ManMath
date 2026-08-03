import { HeroSection } from '../../components/marketing/HeroSection';
import { FinalCtaSection } from '../../components/marketing/FinalCtaSection';
import { PracticeLoopSection } from '../../components/marketing/PracticeLoopSection';
import { ProductShowcase } from '../../components/marketing/ProductShowcase';

export default function PublicHomePage() {
  return (
    <main id="main-content" className="flex-1 text-text-primary">
      <HeroSection />
      <PracticeLoopSection />
      <ProductShowcase />
      <FinalCtaSection />
    </main>
  );
}
