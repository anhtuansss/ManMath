# ManMath

ManMath là ứng dụng luyện đề Toán THPT bằng tiếng Việt. Hệ thống hiện dùng exam engine V2-only: nội dung đã publish có version bất biến, bài làm được chấm ở backend và lịch sử luôn gắn với đúng version đã nộp.

## Current capabilities

- Khám phá, tìm kiếm và lọc đề đã publish.
- Làm đề V2 theo chế độ toàn bộ câu hoặc từng câu, có timer và browser autosave.
- Ba dạng câu hỏi: `single_choice`, `true_false_group`, `short_answer`.
- Backend validation, normalization và server-side grading theo ScoreUnits.
- Persisted attempt, safe receipt, owner review, history và progress.
- Luyện tập theo chuyên đề từ published V2 content, không tạo `Attempt`.
- Analytics topic/subtopic và recommendation rule-based.
- Google Login, JWT, owner-only history/review và anonymous receipt token.
- Internal draft preview theo verified JWT email allowlist.

## Tech stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, KaTeX.
- Backend: Express, TypeScript, Prisma.
- Database: PostgreSQL.

## Project structure

```text
frontend/
  src/app/                 Next.js routes và layouts
  src/components/          UI, V2 taking/review, workspace
  src/lib/                 auth, routing và browser storage helpers
  public/images/           static content assets
backend/
  src/routes/              Express route definitions
  src/controllers/         HTTP boundaries
  src/services/            V2 domain/application services
  src/scripts/             import, publish, audit và verification
  src/test-fixtures/       isolated V2 fixtures
  prisma/                  current schema và migration history
docs/                      canonical technical documentation
```

## Local setup

Prerequisites: Node.js, npm và PostgreSQL.

```powershell
cd backend
npm install
npx prisma migrate dev
npm run dev
```

Backend cần `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`; production cần thêm `CORS_ORIGIN`.

```powershell
cd frontend
npm install
npm run dev
```

Frontend dùng `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Có thể chạy dev server từ repository root:

```powershell
npm run dev:backend
npm run dev:frontend
```

## Verification

```powershell
cd backend
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run verify:exam-domain
npm run verify:exam-content-import
npm run verify:exam-publish-readiness
```

Mutating verification phải chạy trên database disposable có tên kết thúc bằng `_verify`:

```powershell
$env:VERIFY_DATABASE_URL = 'postgresql://USER:PASSWORD@localhost:5432/manmath_db_verify?schema=public'
$env:VERIFY_DATABASE_CONFIRM = 'MANMATH_VERIFY_DB'
npm run verify:isolated
```

```powershell
cd frontend
npm run type-check
npm run build
npm run test:e2e
```

Chi tiết guard và target verification nằm trong [Testing](docs/TESTING.md).

## Content import

Production example: `backend/src/data/import/thpt-math-2026-001.json`.

```powershell
cd backend
npm run import:exam-content -- ./src/data/import/thpt-math-2026-001.json
npm run import:exam-content -- ./src/data/import/thpt-math-2026-001.json --write
npm run publish:exam-content -- thpt-math-2026-001
```

Đọc [Import JSON](docs/IMPORT_JSON.md) và [Content lifecycle](docs/CONTENT_IMPORT.md) trước khi publish.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Authentication and authorization](docs/AUTH.md)
- [Scoring](docs/SCORING.md)
- [Development workflow](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [UI design system](docs/UI_DESIGN_SYSTEM.md)
- [Product tasks](TASKS.md)
