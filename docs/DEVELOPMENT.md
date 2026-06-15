# Hướng dẫn phát triển

## Chạy local chi tiết

Repo có `backend/` và `frontend/` package riêng. Root `package.json` chỉ là manifest nhỏ, không chứa script dev/build chính.

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Prisma commands

```bash
cd backend
npx prisma validate
npx prisma migrate dev
npx prisma migrate status
npx prisma studio
npm run seed
npm run seed:demo
```

## Typecheck và build

### Backend

```bash
cd backend
npx tsc --noEmit
```

### Frontend

```bash
cd frontend
npx tsc --noEmit
npm run build
```

## Import đề từ JSON

Script import MVP dùng để thêm hoặc cập nhật đề thi từ file JSON vào PostgreSQL.

Workflow chuẩn:

- `npm run seed`: reset về dataset mock chuẩn
- `npm run seed:demo`: reset dataset mock chuẩn và import thêm sample JSON exam
- `npm run import:exam -- ./src/data/import/sample-exam.json`: import hoặc cập nhật riêng một đề JSON
- `npm run import:exam -- ./src/data/import/sample-exam.json --dry-run`: validate và in summary, không ghi DB
- `npm run import:exam -- ./src/data/import/manifest.json --batch`: import nhiều đề qua manifest
- `npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run`: validate cả batch mà không ghi DB

Lệnh mẫu:

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json
```

Dry-run mẫu:

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json --dry-run
```

Batch import mẫu:

```bash
cd backend
npm run import:exam -- ./src/data/import/manifest.json --batch
```

Batch dry-run mẫu:

```bash
cd backend
npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run
```

Ghi chú:

- `npm run seed` và `npm run seed:demo` sẽ reset dữ liệu exam/question/topic và xóa attempt local; chỉ chạy khi đang dùng DB dev/demo
- import lại cùng `exam.id` sẽ update thay vì tạo duplicate
- `question.id` phải ổn định và không được trùng với exam khác
- dry-run sẽ báo danh sách lỗi rõ theo field, ví dụ `questions[3].correctAnswer must be one of options`
- batch mode resolve path theo thư mục chứa file manifest
- tài liệu chi tiết nằm ở [docs/IMPORT_JSON.md](./IMPORT_JSON.md)

## Demo analytics data workflow

Seed/import chỉ tạo dữ liệu nội dung như exam, question, topic, subtopic, image và explanation. Các màn analytics cá nhân cần dữ liệu học tập thật của user trong `Attempt` và `AttemptAnswer`.

Workflow demo khuyến nghị:

1. Chuẩn bị đề/câu hỏi demo:

   ```bash
   cd backend
   npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run
   npm run import:exam -- ./src/data/import/manifest.json --batch
   ```

2. Chỉ reset database demo/dev khi chấp nhận mất lịch sử làm bài:

   ```bash
   cd backend
   npm run seed:demo
   ```

3. Chạy backend và frontend.
4. Login bằng Google trên frontend.
5. Làm 1-2 đề và submit. Nếu cần demo recommendation rõ hơn, có thể cố tình sai vài câu trong cùng một topic để tạo chuyên đề yếu.
6. Mở các màn:

   - `/analytics`: topic stats, progress và recommendation.
   - `/history`: lịch sử làm bài toàn cục.
   - `/profile`: thông tin user, hoạt động gần đây và CTA học tiếp.
   - `/exams`: danh sách đề và card gợi ý luyện tập.

Cảnh báo:

- `npm run seed` và `npm run seed:demo` xóa `Attempt`/`AttemptAnswer`, nên sẽ làm mất dữ liệu analytics/history đã tạo bằng cách submit bài.
- Import JSON chỉ upsert `Exam`, `Question`, `Topic`, `Subtopic`; không tạo user giả và không tạo attempt.
- Practice theo topic là flow luyện local/dynamic, không ghi `Attempt`, nên không làm tăng progress/history.

## Smoke test tối thiểu

### Backend

```bash
cd backend
npx tsc --noEmit
npx prisma validate
npx prisma migrate status
npm run seed:demo
npm run import:exam -- ./src/data/import/sample-exam.json --dry-run
npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run
```

### Frontend

```bash
cd frontend
npm run build
```

Manual QA nên kiểm tra thêm:

- `/exams`: search/filter, active chips, filter collapse trên mobile, sidebar recommendation
- `/exam/[id]`: timer, autosave, question image, option image
- `/exam/[id]/result`: result question navigator, review, explanation
- `/exam/[id]/attempts` và `/attempts/[attemptId]`: protected state và review navigation
- `/history`, `/profile`, `/analytics`
- `/practice/topic/[topicSlug]`: focus mode, không hiện global AppNav, timer/submit local vẫn hoạt động
- Google login/logout với credential thật nếu có

## Git workflow gợi ý

- Tạo branch riêng cho từng task
- Commit theo step nhỏ
- Với thay đổi lớn, chia thành nhiều commit rõ mục tiêu
- Tránh `git add .` khi đang có nhiều thay đổi lẫn nhau
- Kiểm tra `git status` trước khi commit
- Không commit `.env`, `.env.local`, `.next`, `node_modules`, file build/cache local

## Troubleshooting

### Thiếu `node_modules`

Triệu chứng:

- `npm run dev` hoặc `npm run build` báo thiếu package

Cách xử lý:

```bash
npm install
```

### Thiếu `.env`

Triệu chứng:

- backend fail fast vì thiếu `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`
- frontend không gọi đúng API hoặc không hiện Google Login

Cách xử lý:

- kiểm tra `backend/.env`
- kiểm tra `frontend/.env.local`

### Prisma drift ở local

Triệu chứng:

- `prisma migrate dev` báo drift hoặc migration history lệch

Cách xử lý:

- xác nhận đây là local dev database
- nếu chấp nhận mất dữ liệu local, dùng `npx prisma migrate reset`
- seed lại dữ liệu sau khi reset

### Frontend build và font

Trạng thái hiện tại:

- frontend đã bỏ phụ thuộc build-time vào `next/font/google`
- build không cần tải Google Fonts từ internet

Nếu ai đó thêm lại `next/font/google`, cần kiểm tra `src/app/layout.tsx`.

### Cache Next.js hoặc Tailwind

Triệu chứng:

- giao diện không phản ánh thay đổi mới

Cách xử lý:

- dùng dev server
- chạy lại `npm run dev`
- nếu cần, xóa cache build local trước khi chạy lại
