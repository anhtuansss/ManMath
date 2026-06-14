# ManMath

## Gioi thieu

ManMath la web luyen de Toan THPT theo huong MVP gon, de hoc va de demo. Nguoi dung co the chon de, lam bai, nop bai, xem ket qua, review dap an, xem lich su, theo doi analytics va nhan goi y luyen tap.

He thong hien dung Next.js o frontend, Express o backend, PostgreSQL + Prisma cho du lieu, va Google Login + JWT cho tai khoan.

## Tinh nang chinh

- [x] Danh sach de thi va route `/exams`
- [x] Lam bai, autosave, submit, result page, review dap an
- [x] Search/filter de theo keyword, topic, subtopic, thoi luong, do kho, nam, nguon
- [x] App navigation, mobile filter collapse va active filter chips
- [x] Global history `/history`, attempt detail va profile `/profile`
- [x] Google Login + JWT + protect history/analytics theo user
- [x] Topic analytics, recommendation MVP, analytics dashboard `/analytics`
- [x] Practice by weak topic MVP
- [x] KaTeX math rendering
- [x] Question image, option image va explanation MVP
- [x] Import de tu JSON qua backend script

## Tech Stack

| Thanh phan | Cong nghe |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS |
| Backend | Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Google Login, JWT |
| Math rendering | KaTeX |

## Kien truc tong quan

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

## Chay local

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

## Env chinh

### Backend

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

Ghi chu:

- Khong commit `.env` hoac `.env.local`
- `JWT_SECRET` chi dung o backend
- Bien `NEXT_PUBLIC_*` la public env cho browser

## Docs chi tiet

- [Kien truc he thong](docs/ARCHITECTURE.md)
- [API hien co](docs/API.md)
- [Auth flow](docs/AUTH.md)
- [Database va Prisma](docs/DATABASE.md)
- [Huong dan phat trien](docs/DEVELOPMENT.md)
- [Import de tu JSON](docs/IMPORT_JSON.md)

Analytics/recommendation ca nhan can user login va submit bai that. Workflow tao du lieu demo nam trong [Huong dan phat trien](docs/DEVELOPMENT.md#demo-analytics-data-workflow).

## Roadmap ngan

- Refresh Token
- Email/password login
- Cap nhat thong tin ca nhan
- Upload va quan ly anh cau hoi/dap an
- Analytics sau hon va theo doi tien bo dai han
- Mo rong import de ngoai JSON
- AI feedback / explanation runtime
