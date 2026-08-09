# Hướng dẫn phát triển

## Chạy local

Repository có package riêng trong `backend/` và `frontend/`. Root cung cấp các shortcut `dev:backend`, `dev:frontend` và `build:frontend`.

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

Backend cần `DATABASE_URL`, `GOOGLE_CLIENT_ID` và `JWT_SECRET`. Xem [README](../README.md) và [AUTH.md](AUTH.md) để biết các biến còn lại.

## Prisma commands

```bash
cd backend
npx prisma validate
npx prisma migrate status
npx prisma migrate dev
npx prisma studio
```

`npm run seed` và `npm run seed:demo` reset dữ liệu demo/development, bao gồm attempts. Chỉ chạy khi chấp nhận mất history/analytics local.

## Typecheck, build và verify

```bash
cd backend
npx tsc --noEmit
npx prisma validate
npm run verify:exam-domain
npm run verify:exam-content-import
```

Các script dưới đây cần database development hợp lệ và có thể ghi dữ liệu kiểm tra:

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

Không có markdown lint script trong package scripts hiện tại. Với thay đổi docs, xác minh link nội bộ, paths, endpoint, script và Prisma field names là đủ; không cần chạy app build chỉ vì docs.

## Legacy JSON import

Legacy importer dùng shape `options` + `correctAnswer` và mặc định ghi database.

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json
npm run import:exam -- ./src/data/import/sample-exam.json --dry-run
npm run import:exam -- ./src/data/import/manifest.json --batch
npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run
```

Single-file import chạy trong transaction. Batch validate toàn bộ files trước khi ghi, sau đó import từng file; batch không phải một transaction bao trùm mọi file.

## V2 JSON content import

V2 importer yêu cầu `schemaVersion: 2`, exam metadata, taxonomy và V2 domain questions. Mặc định là dry-run. Chỉ `--write` mới thay đổi database.

```bash
cd backend
npm run import:exam-content -- ./src/data/import/sample-exam-content-v2.json
npm run import:exam-content -- ./src/data/import/sample-exam-content-v2.json --write
```

V2 import validate toàn bộ payload rồi upsert exam/taxonomy/questions trong một Prisma transaction. Nó không có manifest batch mode hiện tại.

Xem [IMPORT_JSON.md](IMPORT_JSON.md) để biết hai format và giới hạn pipeline.

## Manual QA

### Legacy surfaces

- `/`: landing và public navigation.
- `/dashboard`: exam library, search/filter và workspace shell.
- `/exams`: redirect về `/dashboard`.
- `/exam/[id]`: timer, autosave, submit và guest/auth behavior.
- `/exam/[id]/result`: legacy review, correct answers/explanations.
- `/exam/[id]/attempts`, `/attempts/[attemptId]`: owner-only history/review.
- `/history`, `/profile`, `/analytics`: logged-out state, logged-in state và pagination.
- `/practice/topic/[topicSlug]`: focus layout, local grading, no persisted attempt.

### V2 surfaces

- `/exam-v2/[id]`: public V2 content, stable-ID answers, single choice/true-false/short-answer UI, autosave và timer.
- Submit V2 with and without JWT: attempt persistence, session result và anonymous limitation.
- `/exam-v2/[id]/result?attemptId=...`: owner receipt reload after login; anonymous result only from the immediate browser session.
- Confirm that V2 result does not reveal answer key/explanation.
- Confirm existing V2 attempts in global history do not claim full legacy review compatibility.

## Troubleshooting

### Missing dependencies

Run `npm install` inside the affected package directory.

### Missing environment variables

Check `backend/.env` for backend secrets/database and `frontend/.env.local` for public API/Google settings. Backend fails fast when required variables are absent.

### Prisma drift

Use `npx prisma migrate status` first. `npx prisma migrate reset` is destructive for the local database; only use it after accepting data loss and then seed/import again.

### Next.js cache or fonts

The frontend does not depend on `next/font/google` at build time. Restart the dev server after CSS/config changes; do not commit `.next` or `node_modules`.
