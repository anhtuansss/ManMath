import Link from 'next/link';

export const metadata = {
  title: 'Về ManMath - Nền tảng luyện thi Toán THPT',
  description: 'Tìm hiểu về sứ mệnh và công nghệ của nền tảng luyện thi Toán THPT ManMath.',
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-text-secondary transition-colors duration-200 hover:text-primary mb-8"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Quay lại trang chủ
          </Link>

          <article className="prose prose-slate max-w-none">
            <h1 className="font-[family-name:var(--font-outfit)] text-4xl font-bold tracking-tight text-text-primary mb-4">
              Về ManMath
            </h1>
            
            <p className="text-lg leading-relaxed text-text-secondary mb-8">
              ManMath là nền tảng luyện thi Toán THPT Quốc gia trực tuyến, được thiết kế với giao diện hiện đại, tối giản và tập trung vào trải nghiệm học tập của học sinh.
            </p>

            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-text-primary mt-10 mb-4">Sứ mệnh</h2>
            <p className="text-text-secondary leading-relaxed mb-6">
              Chúng tôi tin rằng việc luyện đề không nên là một trải nghiệm nhàm chán và căng thẳng. Bằng cách kết hợp giữa công nghệ hiện đại và thiết kế trải nghiệm người dùng (UX) tối ưu, ManMath giúp học sinh làm quen với áp lực phòng thi một cách tự nhiên nhất.
            </p>

            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-text-primary mt-10 mb-4">Công nghệ</h2>
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm mb-6">
              <ul className="space-y-3 text-text-secondary m-0 p-0 list-none">
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-xs">F</span>
                  <strong>Frontend:</strong> Next.js (App Router), TypeScript, Tailwind CSS, KaTeX.
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs">B</span>
                  <strong>Backend:</strong> Express, Node.js, TypeScript.
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 font-bold text-xs">D</span>
                  <strong>Database:</strong> PostgreSQL.
                </li>
              </ul>
            </div>

            <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-text-primary mt-10 mb-4">Tác giả</h2>
            <p className="text-text-secondary leading-relaxed mb-6">
              Được phát triển như một dự án mã nguồn mở với sự tập trung cao độ vào kiến trúc và thẩm mỹ giao diện. Nếu bạn quan tâm đến việc đóng góp hoặc tìm hiểu cách hệ thống hoạt động, mã nguồn luôn được công khai.
            </p>

            <div className="mt-8 flex gap-4">
              <a 
                href="https://github.com/anhtuansss/manmath" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-text-primary px-6 text-sm font-semibold text-white transition-colors duration-200 hover:bg-text-primary/90 focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2"
              >
                <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Xem trên GitHub
              </a>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
