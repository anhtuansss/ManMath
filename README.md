# ManMath

ManMath là ứng dụng luyện đề Toán THPT theo nhịp làm bài thật: chọn đề, làm bài có bấm giờ, nộp bài, xem lại đáp án và xác định chuyên đề cần ôn tiếp.

## Trạng thái hiện tại

MVP đã có landing page công khai, workspace học tập, làm đề ở focus mode, chấm điểm và review, lịch sử làm bài phân trang, analytics theo topic/subtopic, hồ sơ và recommendation rule-based. Guest có thể làm đề; dữ liệu history, analytics và attempt detail yêu cầu đăng nhập Google.

## Tính năng đã có

- Landing page public và dashboard luyện tập tại `/dashboard`.
- Danh sách đề, tìm kiếm/lọc, làm đề, timer và autosave local.
- Submit, score, result/review, lời giải, KaTeX và ảnh câu hỏi/đáp án.
- Google Login + JWT; ownership cho history và attempt detail.
- History phân trang phía server, analytics topic/subtopic, profile và practice theo topic.
- Import đề từ JSON qua script backend.

## Kiến trúc

```text
Next.js App Router → Express API → Prisma → PostgreSQL
```

Frontend dùng ba route groups:

| Nhóm | Mục đích | Routes chính |
| --- | --- | --- |
| `(public)` | Landing và thông tin công khai | `/`, `/about` |
| `(workspace)` | Không gian luyện tập có sidebar/header | `/dashboard`, `/analytics`, `/history`, `/profile` |
| `(focus)` | Làm bài và review không bị phân tán | `/exam/[id]`, `/exam/[id]/result`, `/attempts/[attemptId]`, `/practice/topic/[topicSlug]` |

`/exams` là route tương thích cũ và redirect về `/dashboard`.

## Tech stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, KaTeX.
- Backend: Express, TypeScript, Prisma.
- Database: PostgreSQL.
- Auth: Google Login và JWT.

## Chạy local

```bash
cd backend
npm install
npx prisma migrate dev
npm run seed:demo
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Biến môi trường

Backend cần `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET` và `JWT_EXPIRES_IN`.

Frontend dùng `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_GOOGLE_CLIENT_ID` khi cần Google Login. Không commit `.env` hoặc `.env.local`; `JWT_SECRET` chỉ thuộc backend.

## Kiểm tra

```bash
cd backend
npx tsc --noEmit
npx prisma validate
```

```bash
cd frontend
npm run type-check
npm run build
```

## Tài liệu

- [Kiến trúc](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Auth](docs/AUTH.md)
- [Database](docs/DATABASE.md)
- [Design system](docs/UI_DESIGN_SYSTEM.md)
- [Hướng dẫn phát triển](docs/DEVELOPMENT.md)
- [Import JSON](docs/IMPORT_JSON.md)

## Screenshot sản phẩm

Các ảnh chụp từ UI thật được dùng cho landing:

- `frontend/public/images/landing/exam-workspace.webp`
- `frontend/public/images/landing/result-review.webp`

## Roadmap ngắn

- Mở rộng analytics theo subtopic khi dữ liệu nội dung đủ tin cậy.
- Mở rộng pipeline import ngoài JSON.
- Cải thiện testing và manual QA cho các flow có auth.
- AI feedback/explanation runtime được để lại sau khi content và analytics ổn định.
