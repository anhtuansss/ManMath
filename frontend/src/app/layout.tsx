import 'katex/dist/katex.min.css';
import './globals.css';
import type { Metadata } from 'next';
import { ErrorBoundary } from '../components/layout/ErrorBoundary';

export const metadata: Metadata = {
  title: 'ManMath | Luyện đề Toán THPT',
  description:
    'Nền tảng luyện đề Toán THPT với giao diện tập trung, đồng hồ bấm giờ và xem lại kết quả chi tiết.',
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
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
