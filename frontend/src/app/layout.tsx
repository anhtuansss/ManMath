import 'katex/dist/katex.min.css';
import './globals.css';
import { AuthProvider } from '../components/auth/AuthProvider';
import { AppSidebar } from '../components/layout/AppSidebar';
import { AppHeader } from '../components/layout/AppHeader';

export const metadata = {
  title: 'ManMath - Luyen de Toan THPT Quoc gia',
  description:
    'Nen tang luyen de Toan THPT truc tuyen voi giao dien tap trung, dong ho bam gio va xem lai ket qua chi tiet.',
};

const APP_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body
        className="bg-background text-text-primary antialiased"
        style={{ fontFamily: APP_FONT_STACK }}
      >
        <AuthProvider>
          <div className="flex min-h-[100dvh] bg-background">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
              <AppHeader />
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
