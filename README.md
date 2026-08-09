# ManMath

ManMath là ứng dụng web luyện đề Toán THPT bằng tiếng Việt. MVP hỗ trợ chọn đề, làm bài có bấm giờ, nộp bài, xem kết quả và theo dõi lịch sử học tập.

## Trạng thái dự án

Sản phẩm có landing page công khai, workspace học tập, flow làm đề legacy và một exam engine V2 song song. V2 hiện hỗ trợ ba dạng câu hỏi (`single_choice`, `true_false_group`, `short_answer`), runtime validation, chấm điểm ở backend, lưu attempt và receipt theo owner.

Flow chính từ dashboard, recommendation, history và profile vẫn dùng legacy route `/exam/[id]`. V2 nằm tại `/exam-v2/[id]` và chưa thay thế toàn bộ flow legacy.

## Tính năng hiện có

- Landing public tại `/`; workspace tại `/dashboard`; `/exams` redirect tương thích về `/dashboard`.
- Danh sách đề, tìm kiếm/lọc, timer và autosave browser cho flow làm đề.
- Legacy exam: submit, review đáp án/lời giải, ảnh câu hỏi/đáp án và KaTeX.
- V2 exam: stable string IDs, ba loại câu hỏi, autosave V2, server-side grading, persisted attempt và safe result receipt.
- Google Login + JWT; ownership cho history, attempt detail legacy và V2 receipt.
- History phân trang phía server, analytics topic/subtopic, profile và recommendation rule-based.
- Hai importer JSON: legacy importer và V2 content importer có runtime validation.

## Kiến trúc ngắn

```text
Next.js App Router → Express API → Prisma → PostgreSQL
```

Frontend chia ba route group:

| Nhóm | Mục đích | Routes chính |
| --- | --- | --- |
| `(public)` | Landing và nội dung công khai | `/`, `/about` |
| `(workspace)` | Workspace với sidebar/header | `/dashboard`, `/analytics`, `/history`, `/profile`, `/exams` |
| `(focus)` | Làm đề, kết quả và review không có workspace shell | `/exam/[id]`, `/exam-v2/[id]`, result/attempt routes, `/practice/topic/[topicSlug]` |

Xem [kiến trúc chi tiết](docs/ARCHITECTURE.md) để biết ranh giới V1/V2 và các technical debt còn lại.

## Tech stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, KaTeX.
- Backend: Express, TypeScript, Prisma.
- Database: PostgreSQL.
- Auth: Google Login và JWT ManMath.

## Chạy local

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Hoặc từ root:

```bash
npm run dev:backend
npm run dev:frontend
```

## Biến môi trường

Backend bắt buộc có `DATABASE_URL`, `GOOGLE_CLIENT_ID` và `JWT_SECRET`. `JWT_EXPIRES_IN` là optional, mặc định `7d`; `PORT` mặc định `5000`.

Frontend dùng `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_GOOGLE_CLIENT_ID` khi cần Google Login. Không commit `.env` hoặc `.env.local`; `JWT_SECRET` chỉ thuộc backend.

## Kiểm tra

```bash
cd backend
npx tsc --noEmit
npx prisma validate
npm run verify:exam-domain
npm run verify:exam-content-import
```

Các verify V2 đọc/ghi database cần `DATABASE_URL` hợp lệ:

```bash
cd backend
npm run verify:exam-content-persistence
npm run verify:exam-content-read
npm run verify:exam-content-grading-api
npm run verify:exam-content-attempt-persistence
npm run verify:exam-content-attempt-read
```

```bash
cd frontend
npm run type-check
npm run build
```

## Tài liệu

- [Kiến trúc](docs/ARCHITECTURE.md)
- [API V1 và V2](docs/API.md)
- [Auth](docs/AUTH.md)
- [Database và Prisma](docs/DATABASE.md)
- [Scoring V2](docs/SCORING.md)
- [Import JSON](docs/IMPORT_JSON.md)
- [Hướng dẫn phát triển](docs/DEVELOPMENT.md)
- [UI design system](docs/UI_DESIGN_SYSTEM.md)

## Roadmap ngắn

- Hoàn thiện migration từ legacy exam flow sang V2.
- Quy định review-answer reveal và snapshot/versioning cho attempt V2.
- Mở rộng analytics để diễn giải partial score V2 chính xác hơn.
- Tăng test coverage và manual QA cho auth, ownership và attempt compatibility.
