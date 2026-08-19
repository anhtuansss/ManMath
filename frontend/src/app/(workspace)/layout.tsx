import { AuthProvider } from '../../components/auth/AuthProvider';
import { AppHeader } from '../../components/layout/AppHeader';
import { AppSidebar } from '../../components/layout/AppSidebar';
import { WorkspaceScrollReset } from '../../components/layout/WorkspaceScrollReset';

type WorkspaceLayoutProps = {
  children: React.ReactNode;
};

/**
 * Shared workspace shell. This route group preserves guest access while
 * keeping authentication UI and navigation out of public and focus routes.
 */
export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <AuthProvider>
      <div className="workspace-shell flex min-h-[100dvh] bg-background">
        <WorkspaceScrollReset />
        <a href="#main-content" className="skip-link">
          Bỏ qua điều hướng
        </a>
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <AppHeader />
          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
