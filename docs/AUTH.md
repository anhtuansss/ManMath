# Auth trong ManMath

## Hướng hiện tại

ManMath dùng Google Login ở frontend, backend verify Google credential, sau đó backend phát hành JWT riêng của ManMath. Chưa có refresh token, email/password login hoặc password management hoàn chỉnh.

```text
Frontend Google Login
→ Google credential / ID token
→ POST /api/auth/google
→ backend verify với Google
→ find-or-create User trong PostgreSQL
→ ký JWT ManMath
→ frontend lưu JWT
→ Authorization: Bearer <token> cho protected API
```

Google credential chỉ dùng để đăng nhập với backend. JWT ManMath là token nội bộ, chỉ chứa payload tối thiểu như `userId` và `email`; không chứa password hoặc Google credential gốc.

## Middleware và endpoint behavior

`authMiddleware` yêu cầu JWT hợp lệ, thiếu hoặc sai token trả `401`. Nó bảo vệ:

- `GET /api/auth/me`
- `GET /api/me/topic-stats`, `/subtopic-stats`, `/recommendations`, `/progress`, `/attempts`
- `GET /api/exams/:id/attempts`
- `GET /api/attempts/:attemptId`
- `GET /api/v2/attempts/:attemptId`

`optionalAuthMiddleware` chấp nhận request không có token, nhưng gắn `req.user` khi token hợp lệ. Nó được dùng cho:

- `POST /api/exam/submit` legacy
- `POST /api/v2/exams/:id/attempts`

`GET /api/v2/exams/:id` và `POST /api/v2/exams/:id/grade` là public. Public không đồng nghĩa answer key được trả; V2 public DTO luôn loại bỏ key material.

## Ownership

User chỉ đọc được history, legacy attempt detail và V2 receipt của chính mình. V2 receipt lookup theo cả attempt ID và authenticated `userId`; anonymous V2 attempts không có owner nên không thể tải lại qua receipt endpoint.

Legacy/V2 create attempt vẫn persist anonymous attempt để giữ guest flow. Đây không phải history có thể truy xuất cho guest.

## Environment variables

### Backend

- `GOOGLE_CLIENT_ID` - bắt buộc.
- `JWT_SECRET` - bắt buộc, chỉ ở backend.
- `JWT_EXPIRES_IN` - optional, mặc định `7d`.

`DATABASE_URL` cũng là biến backend bắt buộc để truy cập user/attempt data.

### Frontend

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_API_BASE_URL`

## Security notes

- Không commit `.env` hoặc `.env.local`.
- Không hardcode hay log secret/Google credential.
- Không lưu password khi password auth chưa được hỗ trợ đầy đủ.
- V1 public exam detail vẫn có `correctAnswer`; đây là technical debt riêng của legacy API.
- V2 grade API không trả key trực tiếp nhưng trả correctness/score, nên future abuse/rate-limit policy vẫn cần được quyết định.
