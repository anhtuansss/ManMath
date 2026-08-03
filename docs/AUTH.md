# Auth trong ManMath

## Hướng hiện tại

ManMath đang dùng hướng:

- Google Login ở frontend
- Backend verify Google credential
- Backend phát hành JWT riêng của ManMath

Chưa làm ở giai đoạn hiện tại:

- Refresh Token
- Email/password login
- Đổi mật khẩu

## Luồng đăng nhập

```text
Frontend Google Login
↓
Nhận Google credential / ID token
↓
Gửi về POST /api/auth/google
↓
Backend verify với Google
↓
Find-or-create User trong PostgreSQL
↓
Ký JWT ManMath
↓
Frontend lưu JWT
↓
Frontend gửi Authorization: Bearer <token>
```

## Google ID token và JWT ManMath

### Google ID token

- Được dùng để chứng minh user đã đăng nhập Google
- Chỉ dùng ở bước login với backend

### JWT ManMath

- Là token nội bộ của hệ thống
- Dùng để gọi các API protected sau khi login
- Chỉ chứa thông tin tối thiểu như `userId`, `email`

Không đưa vào token:

- password
- passwordHash
- Google credential gốc

## Auth middleware

### `authMiddleware`

- Dùng cho route bắt buộc đăng nhập
- Thiếu token hoặc token sai sẽ trả `401`

Các route đang protected:

- `GET /api/auth/me`
- `GET /api/me/topic-stats`
- `GET /api/me/subtopic-stats`
- `GET /api/me/recommendations`
- `GET /api/me/progress`
- `GET /api/me/attempts`
- `GET /api/exams/:id/attempts`
- `GET /api/attempts/:attemptId`

### `optionalAuthMiddleware`

- Dùng cho `POST /api/exam/submit`
- Nếu có token hợp lệ thì gắn `req.user`
- Nếu không có token thì vẫn cho submit anonymous

## Protected history

History và attempt detail hiện không còn public.

Chính sách hiện tại:

- User chỉ xem được danh sách attempt của chính mình
- User chỉ xem được chi tiết attempt nếu là owner
- Anonymous user không xem được history/attempt detail

## Env liên quan auth

### Backend

- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

### Frontend

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## Security notes

- Không commit `.env`
- Không hardcode secret
- `JWT_SECRET` chỉ dùng ở backend
- Không log Google credential
- Không lưu password khi chưa hỗ trợ password auth
