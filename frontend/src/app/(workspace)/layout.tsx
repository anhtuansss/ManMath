import { AuthProvider } from '../../components/auth/AuthProvider';
import { AppHeader } from '../../components/layout/AppHeader';
import { AppSidebar } from '../../components/layout/AppSidebar';

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
      <div className="flex min-h-[100dvh] bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
          <AppHeader />
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}
