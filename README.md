# ManMath

## Giới thiệu

ManMath là web luyện đề Toán THPT theo hướng MVP gọn, dễ học và để demo. Người dùng có thể chọn đề, làm bài, nộp bài, xem kết quả, review đáp án, xem lịch sử, theo dõi analytics và nhận gợi ý luyện tập.

Hệ thống hiện dùng Next.js ở frontend, Express ở backend, PostgreSQL + Prisma cho dữ liệu, và Google Login + JWT cho tài khoản.

## Tính năng chính

- [x] Danh sách đề thi và route `/exams`
- [x] Làm bài, autosave, submit, result page, review đáp án
- [x] Search/filter đề theo keyword, topic, subtopic, thời lượng, độ khó, năm, nguồn
- [x] App navigation, mobile filter collapse và active filter chips
- [x] Global history `/history`, attempt detail và profile `/profile`
- [x] Google Login + JWT + protect history/analytics theo user
- [x] Topic analytics, recommendation MVP, analytics dashboard `/analytics`
- [x] Practice by weak topic MVP với focus mode
- [x] KaTeX math rendering
- [x] Question image, option image và explanation MVP
- [x] Import đề từ JSON qua backend script

## Tech Stack

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Backend | Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Google Login, JWT |
| Math rendering | KaTeX |

## Kiến trúc tổng quan

```text
Browser
↓
Next.js Frontend
↓
Express API
↓
Prisma ORM
↓
PostgreSQL
```

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

## Env chính

### Backend

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

Ghi chú:

- Không commit `.env` hoặc `.env.local`
- `JWT_SECRET` chỉ dùng ở backend
- Biến `NEXT_PUBLIC_*` là public env cho browser

## Docs chi tiết

- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [API hiện có](docs/API.md)
- [Auth flow](docs/AUTH.md)
- [Database và Prisma](docs/DATABASE.md)
- [Hướng dẫn phát triển](docs/DEVELOPMENT.md)
- [Import đề từ JSON](docs/IMPORT_JSON.md)

Analytics/recommendation cá nhân cần user login và submit bài thật. Workflow tạo dữ liệu demo nằm trong [Hướng dẫn phát triển](docs/DEVELOPMENT.md#demo-analytics-data-workflow).

## Roadmap ngắn

- Refresh Token
- Email/password login
- Cập nhật thông tin cá nhân
- Upload và quản lý ảnh câu hỏi/đáp án
- Analytics sâu hơn và theo dõi tiến bộ dài hạn
- Mở rộng import đề ngoài JSON
- AI feedback / explanation runtime
