# Kiến trúc ManMath

## Tổng quan

ManMath gồm hai phần chính:

- Frontend Next.js để hiển thị danh sách đề, màn làm bài, kết quả, lịch sử, profile, analytics và practice.
- Backend Express để xử lý đề thi, submit bài, auth, history, analytics, recommendation và import data.

Database hiện dùng PostgreSQL, truy cập qua Prisma ORM.

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

## Trách nhiệm từng lớp

### Frontend

- Render UI danh sách đề, làm bài, result review, history, profile, analytics và practice.
- Gọi backend API qua `NEXT_PUBLIC_API_BASE_URL`.
- Lưu autosave bài làm bằng `localStorage`.
- Lưu kết quả submit tạm thời để hiển thị result page.
- Lưu JWT phía client và gửi `Authorization: Bearer <token>` khi user đã login.
- Render KaTeX, ảnh câu hỏi (`imageUrl`), ảnh đáp án (`optionImageUrls`) và lời giải (`explanation`) ở các màn review phù hợp.

### Backend

- Nhận request HTTP từ frontend.
- Tách flow theo route, middleware, controller và service.
- Verify Google credential, ký và verify JWT.
- Chấm điểm bài thi, lưu `Attempt` và `AttemptAnswer`.
- Expose exam/question DTO cho frontend, gồm topic, subtopic, image và explanation.
- Tổng hợp topic/subtopic analytics, progress, recent activity và recommendation.
- Import exam từ JSON single file hoặc batch manifest.

### Database

- Lưu exam, question, topic và subtopic.
- Lưu user.
- Lưu lịch sử làm bài.
- Lưu dữ liệu phục vụ analytics theo user.

## App shell và focus mode

Frontend có global `AppNav` cho các trang thông tin và học tập tổng quan:

- `/`
- `/exams`
- `/analytics`
- `/history`
- `/profile`

Các màn cần tập trung cao có header riêng và ẩn global `AppNav`:

- `/exam/[id]`
- `/attempts/[attemptId]`
- `/practice/topic/[topicSlug]`

Practice Topic page dùng focus layout riêng: header practice gồm brand nhỏ, số câu, tên chuyên đề, timer và nút nộp bài. Flow này giúp màn luyện tập không bị hai tầng navigation.

## Luồng request tổng quát

```text
Request
→ Route
→ Middleware
→ Controller
→ Service
→ Prisma
→ PostgreSQL
```

## Luồng làm bài exam

```text
User vào /exam/[id]
→ Frontend gọi GET /api/exams/:id
→ Render câu hỏi, công thức, ảnh câu hỏi và ảnh đáp án nếu có
→ User chọn đáp án
→ Frontend autosave localStorage
→ User submit
→ Frontend gọi POST /api/exam/submit
→ Backend chấm điểm và lưu Attempt
→ Frontend chuyển sang /exam/[id]/result
→ Result review hiện đáp án, image, explanation và topicStats
```

## Luồng lịch sử làm bài

### Theo đề

```text
User đã login
→ Frontend gọi GET /api/exams/:id/attempts
→ Backend dùng authMiddleware
→ Service chỉ lấy attempt của user hiện tại trong đề đó
→ Frontend hiển thị lịch sử theo đề
```

### Toàn cục

```text
User đã login
→ Frontend gọi GET /api/me/attempts
→ Backend dùng authMiddleware
→ Service lấy attempts của user hiện tại trên tất cả đề
→ Frontend hiển thị /history
```

## Luồng chi tiết attempt

```text
User đã login
→ Frontend gọi GET /api/attempts/:attemptId
→ Backend dùng authMiddleware
→ Service kiểm tra owner
→ Trả attempt + answers + topicStats + imageUrl + optionImageUrls + explanation + subtopic
```

## Luồng topic analytics

### Theo lần submit

```text
POST /api/exam/submit
→ Backend chấm từng câu
→ Gom nhóm theo topic
→ Trả topicStats trong response
```

### Theo attempt detail

```text
GET /api/attempts/:attemptId
→ Backend đọc AttemptAnswer của attempt đó
→ Gom nhóm theo topic
→ Trả topicStats
```

### Theo user

```text
GET /api/me/topic-stats
→ Backend lấy attempts của user hiện tại
→ Tổng hợp theo topic
→ Trả topicStats đã sort
```

### Theo subtopic

```text
GET /api/me/subtopic-stats
→ Backend lấy attempts của user hiện tại
→ Join AttemptAnswer với Question/Subtopic/Topic
→ Trả subtopicStats để /analytics chỉ ra nhóm kiến thức nhỏ cần ôn
```

## Luồng recommendation MVP

```text
User đã login
→ Frontend gọi GET /api/me/recommendations
→ Backend lấy topicStats của user
→ Xác định chuyên đề yếu
→ Tìm đề có nhiều câu thuộc weak topics
→ Trả weakTopics + recommendedExams
→ Frontend hiển thị trên Exam List, Profile và Analytics
```

Recommendation hiện vẫn là rule-based MVP, không dùng AI.

## Luồng practice theo chuyên đề

```text
User vào /analytics hoặc card recommendation
→ Bấm "Luyện chuyên đề này"
→ Frontend mở /practice/topic/[topicSlug]
→ Global AppNav bị ẩn để vào focus mode
→ GET /api/practice/topic/:topicSlug?limit=10
→ Backend tạo practice payload động từ Question theo topic
→ Frontend render câu hỏi, KaTeX, image và option image
→ User chọn đáp án và submit local
→ Frontend tự chấm điểm và review local
```

Ghi chú:

- Flow practice không gọi `POST /api/exam/submit`.
- Flow practice không tạo `Attempt` và không đi vào history/analytics.
- Explanation chỉ hiện sau khi submit local, không hiện khi đang làm.

## Luồng analytics dashboard

```text
User vào /analytics
→ Frontend kiểm tra token
→ Gọi GET /api/me/topic-stats
→ Gọi GET /api/me/subtopic-stats
→ Gọi GET /api/me/progress
→ Gọi GET /api/me/recommendations
→ Render topic overview, subtopic weak spots, progress, weak/strong topics và recommended exams
```

## Luồng profile

```text
User vào /profile
→ Frontend kiểm tra token
→ Gọi GET /api/auth/me
→ Gọi GET /api/me/progress để lấy recentAttempts
→ Gọi GET /api/me/recommendations nếu có token
→ Render user info, recent activity, link analytics và CTA đề nên làm tiếp
```

## Luồng import JSON

```text
npm run import:exam -- ./src/data/import/sample-exam.json
→ Script đọc JSON
→ Validate schema import
→ Upsert Exam, Topic, Subtopic và Question
→ Không tạo Attempt
```

Batch mode:

```text
npm run import:exam -- ./src/data/import/manifest.json --batch
→ Đọc manifest
→ Resolve path relative theo manifest
→ Validate tất cả file
→ Import từng exam nếu hợp lệ
```

Dry-run mode chỉ validate và in report, không ghi database.
