type PublicLayoutProps = {
  children: React.ReactNode;
};

/**
 * Public routes share their own lightweight navigation and footer.
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <a href="#main-content" className="skip-link">
        Bỏ qua điều hướng
      </a>
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
import { PublicFooter } from '../../components/marketing/PublicFooter';
import { PublicHeader } from '../../components/marketing/PublicHeader';
