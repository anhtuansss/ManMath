# Huong dan phat trien

## Chay local chi tiet

Repo co `backend/` va `frontend/` package rieng. Root `package.json` chi la manifest nho, khong chua script dev/build chinh.

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

## Typecheck va build

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

## Import de tu JSON

Script import MVP dung de them hoac cap nhat de thi tu file JSON vao PostgreSQL.

Workflow chuan:

- `npm run seed`: reset ve dataset mock chuan
- `npm run seed:demo`: reset dataset mock chuan va import them sample JSON exam
- `npm run import:exam -- ./src/data/import/sample-exam.json`: import hoac cap nhat rieng mot de JSON
- `npm run import:exam -- ./src/data/import/sample-exam.json --dry-run`: validate va in summary, khong ghi DB
- `npm run import:exam -- ./src/data/import/manifest.json --batch`: import nhieu de qua manifest
- `npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run`: validate ca batch ma khong ghi DB

Lenh mau:

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json
```

Dry-run mau:

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json --dry-run
```

Batch import mau:

```bash
cd backend
npm run import:exam -- ./src/data/import/manifest.json --batch
```

Batch dry-run mau:

```bash
cd backend
npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run
```

Ghi chu:

- `npm run seed` va `npm run seed:demo` se reset du lieu exam/question/topic va xoa attempt local; chi chay khi dang dung DB dev/demo
- import lai cung `exam.id` se update thay vi tao duplicate
- `question.id` phai on dinh va khong duoc trung voi exam khac
- dry-run se bao danh sach loi ro theo field, vi du `questions[3].correctAnswer must be one of options`
- batch mode resolve path theo thu muc chua file manifest
- tai lieu chi tiet nam o [docs/IMPORT_JSON.md](./IMPORT_JSON.md)

## Demo analytics data workflow

Seed/import chi tao du lieu noi dung nhu exam, question, topic, subtopic, image va explanation. Cac man analytics ca nhan can du lieu hoc tap that cua user trong `Attempt` va `AttemptAnswer`.

Workflow demo khuyen nghi:

1. Chuan bi de/cau hoi demo:

   ```bash
   cd backend
   npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run
   npm run import:exam -- ./src/data/import/manifest.json --batch
   ```

2. Chi reset database demo/dev khi chap nhan mat lich su lam bai:

   ```bash
   cd backend
   npm run seed:demo
   ```

3. Chay backend va frontend.
4. Login bang Google tren frontend.
5. Lam 1-2 de va submit. Neu can demo recommendation ro hon, co the co tinh sai vai cau trong cung mot topic de tao chuyen de yeu.
6. Mo cac man:

   - `/analytics`: topic stats, progress va recommendation.
   - `/history`: lich su lam bai toan cuc.
   - `/profile`: thong tin user, hoat dong gan day va CTA hoc tiep.
   - `/exams`: danh sach de va card goi y luyen tap.

Canh bao:

- `npm run seed` va `npm run seed:demo` xoa `Attempt`/`AttemptAnswer`, nen se lam mat du lieu analytics/history da tao bang cach submit bai.
- Import JSON chi upsert `Exam`, `Question`, `Topic`, `Subtopic`; khong tao user gia va khong tao attempt.
- Practice theo topic la flow luyen local/dynamic, khong ghi `Attempt`, nen khong lam tang progress/history.

## Smoke test toi thieu

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

Manual QA nen kiem tra them:

- `/exams`: search/filter, active chips, filter collapse tren mobile, sidebar recommendation
- `/exam/[id]`: timer, autosave, question image, option image
- `/exam/[id]/result`: result question navigator, review, explanation
- `/exam/[id]/attempts` va `/attempts/[attemptId]`: protected state va review navigation
- `/history`, `/profile`, `/analytics`
- `/practice/topic/[topicSlug]`
- Google login/logout voi credential that neu co

## Git workflow goi y

- Tao branch rieng cho tung task
- Commit theo step nho
- Voi thay doi lon, chia thanh nhieu commit ro muc tieu
- Tranh `git add .` khi dang co nhieu thay doi lan nhau
- Kiem tra `git status` truoc khi commit
- Khong commit `.env`, `.env.local`, `.next`, `node_modules`, file build/cache local

## Troubleshooting

### Thieu `node_modules`

Trieu chung:

- `npm run dev` hoac `npm run build` bao thieu package

Cach xu ly:

```bash
npm install
```

### Thieu `.env`

Trieu chung:

- backend fail fast vi thieu `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`
- frontend khong goi dung API hoac khong hien Google Login

Cach xu ly:

- kiem tra `backend/.env`
- kiem tra `frontend/.env.local`

### Prisma drift o local

Trieu chung:

- `prisma migrate dev` bao drift hoac migration history lech

Cach xu ly:

- xac nhan day la local dev database
- neu chap nhan mat du lieu local, dung `npx prisma migrate reset`
- seed lai du lieu sau khi reset

### Frontend build va font

Trang thai hien tai:

- frontend da bo phu thuoc build-time vao `next/font/google`
- build khong can tai Google Fonts tu internet

Neu ai do them lai `next/font/google`, can kiem tra `src/app/layout.tsx`.

### Cache Next.js hoac Tailwind

Trieu chung:

- giao dien khong phan anh thay doi moi

Cach xu ly:

- dung dev server
- chay lai `npm run dev`
- neu can, xoa cache build local truoc khi chay lai
