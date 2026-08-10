# Kiến trúc ManMath

## Tổng quan

```text
Browser → Next.js App Router → Express API → Prisma → PostgreSQL
```

Frontend chịu trách nhiệm về presentation, local persistence cho flow làm đề và gọi API. Express tổ chức theo route → middleware → controller → service; Prisma là lớp truy cập PostgreSQL.

## Route architecture

| Route group | Trách nhiệm | Routes |
| --- | --- | --- |
| `(public)` | Nội dung công khai, không phụ thuộc backend để render landing | `/`, `/about` |
| `(workspace)` | App shell với sidebar/header; guest vẫn xem được các màn có state phù hợp | `/dashboard`, `/analytics`, `/history`, `/profile`, `/exams` |
| `(focus)` | Flow cần tập trung, không có workspace sidebar/header | `/exam/[id]`, `/exam/[id]/result`, `/exam-v2/[id]`, `/exam-v2/[id]/result`, `/exam/[id]/attempts`, `/attempts/[attemptId]`, `/practice/topic/[topicSlug]` |

`/` là landing page. `/dashboard` là điểm vào workspace. `/exams` là compatibility route và redirect tới `/dashboard`.

## Frontend responsibilities

- Render landing, workspace, focus mode, KaTeX, câu hỏi/đáp án có ảnh và explanation.
- Đọc `NEXT_PUBLIC_API_BASE_URL` để gọi backend.
- Lưu nháp exam bằng `localStorage`; result sau submit được lưu tạm bằng `sessionStorage` để render route result.
- Đọc JWT ở client và gửi `Authorization: Bearer <token>` cho protected API.
- Presentation filters như filter review chỉ thay đổi UI client, không đổi score hoặc dữ liệu backend.

## Backend responsibilities

- Cung cấp exam/topic/practice APIs; chấm điểm submit và lưu `Attempt`/`AttemptAnswer` khi request có JWT hợp lệ.
- Verify Google credential, phát hành/verify JWT và bảo vệ history/attempt detail theo owner.
- Tổng hợp analytics topic/subtopic, progress và recommendation rule-based.
- Import JSON theo single file hoặc manifest batch.

## Data flows

### Làm đề và result

```text
/exam/[id]
→ GET /api/exams/:id
→ chọn đáp án + autosave localStorage
→ POST /api/exam/submit
→ backend chấm điểm, có thể lưu Attempt
→ sessionStorage result
→ /exam/[id]/result review
```

Guest vẫn submit/làm đề được. Attempt chỉ được gắn user khi JWT hợp lệ. Result route đọc session result; nếu payload không kèm chi tiết exam, frontend lấy lại `GET /api/exams/:id` để review.

### V2 exam attempt and review

```text
/exam-v2/[id]
→ GET /api/v2/exams/:id
→ stable-ID answers + versioned V2 draft storage
→ POST /api/v2/exams/:id/attempts
→ persisted Attempt + AttemptAnswer + exam content snapshot
→ /exam-v2/[id]/result?attemptId=...
→ owner-only receipt/review reads
```

The public exam and receipt endpoints never contain answer keys. An
authenticated owner can explicitly request review after submission. The review
is constructed from the attempt snapshot, so it remains tied to the content at
submit time even if the current exam changes. Review data stays in React memory
and is not persisted in browser storage.

### History và ownership

```text
/history?page=n
→ GET /api/me/attempts?page=n&limit=10
→ authMiddleware
→ Prisma aggregate summary toàn history + findMany skip/take theo userId
→ items + pagination metadata + summary
```

`/api/exams/:id/attempts` và `/api/attempts/:attemptId` cũng yêu cầu login; service chỉ trả dữ liệu của owner hiện tại.

### Analytics và recommendation

Analytics dùng các endpoint protected `/api/me/topic-stats`, `/api/me/subtopic-stats`, `/api/me/progress` và `/api/me/recommendations`. Recommendation là rule-based: xếp topic yếu từ attempt thật, sau đó chọn đề phù hợp; không phải AI.

Practice theo topic dùng `GET /api/practice/topic/:topicSlug?limit=10`, chấm local ở frontend và không tạo `Attempt` hay ảnh hưởng history/analytics.

## Quyết định và trade-off

- **Public/workspace/focus tách route group:** giảm navigation dư trong exam/review, đổi lại cần giữ layout rules rõ ràng.
- **Autosave/result ở browser storage:** giữ flow guest nhanh và không mở rộng API; đổi lại result session không là lịch sử bền vững.
- **History phân trang ở database:** tránh tải toàn bộ attempt về browser; summary vẫn tính trên toàn history, không chỉ page hiện tại.
- **Topic là lớp analytics chính, subtopic là bổ sung:** phù hợp taxonomy MVP nhưng cần dữ liệu nội dung tốt hơn trước khi nâng recommendation.
