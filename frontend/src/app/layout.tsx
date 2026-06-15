import 'katex/dist/katex.min.css';
import './globals.css';
import { AuthProvider } from '../components/auth/AuthProvider';
import { AppNav } from '../components/layout/AppNav';

export const metadata = {
  title: 'ManMath - Luyen de Toan THPT Quoc gia',
  description:
    'Nen tang luyen de Toan THPT truc tuyen voi giao dien tap trung, dong ho bam gio va xem lai ket qua chi tiet.',
};

const APP_FONT_STACK =
  'Inter, Outfit, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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
          <AppNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
