# Database và Prisma

## Công nghệ

- PostgreSQL
- Prisma ORM

## Các model chính

### User

Lưu tài khoản người dùng.

Field chính:

- `id`
- `email`
- `fullName`
- `avatarUrl`
- `googleId`
- `passwordHash`
- `authProvider`

### Exam

Lưu thông tin đề thi.

Field chính:

- `id`
- `title`
- `description`
- `durationMinutes`
- `subject`
- `difficulty`
- `source`
- `year`
- `statusLabel`

Ghi chú:

- `difficulty` hiện dùng enum `easy | medium | hard`
- `source` là metadata string optional cho nguồn đề
- `year` là metadata number optional cho năm thi
- metadata này được expose ra exam list, exam detail và exam filter

### Topic

Lưu nhóm kiến thức lớn.

Field chính:

- `id`
- `name`
- `slug`
- `description`
- `order`

Topic hiện là nền cho:

- topic stats
- recommendation MVP
- analytics dashboard

### Subtopic

Lưu nhóm kiến thức nhỏ hơn, nằm trong một `Topic`.

Field chính:

- `id`
- `name`
- `slug`
- `topicId`

Ghi chú:

- `Subtopic` thuộc đúng một `Topic`
- `Question.subtopicId` là optional
- MVP dùng `Subtopic` để tăng độ chi tiết cho taxonomy, DTO và analytics
- Analytics hiện có API riêng theo subtopic: `GET /api/me/subtopic-stats`

### Question

Lưu từng câu hỏi trong đề.

Field chính:

- `id`
- `examId`
- `order`
- `topicId`
- `subtopicId`
- `question`
- `imageUrl`
- `explanation`
- `options`
- `optionImageUrls`
- `correctAnswer`

Ghi chú:

- `imageUrl` là field optional cho Question Image Support
- `explanation` là field optional cho Explanation MVP, lưu lời giải tĩnh có thể chứa KaTeX
- `optionImageUrls` là mảng string map theo index với `options`
- `subtopicId` là field optional cho Subtopic Mapping MVP
- Ảnh hiện tại được lưu dạng static public path, ví dụ `/images/questions/sample-parabola.svg`
- MVP vẫn giữ `options: string[]`, chưa đổi sang object option model
- Explanation hiện chỉ được render ở result review và attempt detail, không hiển thị trong lúc đang làm bài
- Question DTO / practice payload / attempt detail hiện đều có thể expose `imageUrl`, `optionImageUrls`, `explanation` và `subtopic`

### Attempt

Lưu một lần làm bài.

Field chính:

- `id`
- `examId`
- `userId`
- `score`
- `correctCount`
- `totalQuestions`
- `unansweredCount`
- `startedAt`
- `submittedAt`
- `durationSeconds`

### AttemptAnswer

Lưu từng câu trả lời của một lần làm bài.

Field chính:

- `id`
- `attemptId`
- `questionId`
- `selectedOptionIndex`
- `correctOptionIndex`
- `isCorrect`

## Sơ đồ quan hệ

```text
User 1 --- n Attempt
Exam 1 --- n Question
Exam 1 --- n Attempt
Topic 1 --- n Question
Topic 1 --- n Subtopic
Subtopic 1 --- n Question
Attempt 1 --- n AttemptAnswer
```

## Ghi chú thiết kế

- `Attempt.userId` là nullable để vẫn hỗ trợ anonymous submit
- `AttemptAnswer.questionId` hiện là scalar field, chưa khai báo relation trực tiếp tới `Question`
- Topic và Subtopic được giữ độc lập với attempt data; analytics tính từ `AttemptAnswer` kết hợp `Question`

## Vì sao cần Topic và Subtopic

### Topic

Dùng cho:

- thống kê theo nhóm lớn
- recommendation MVP
- dashboard tổng quan

### Subtopic

Dùng cho:

- phân loại câu hỏi chi tiết hơn
- cải thiện quality của seed/import
- mở đường cho recommendation và analytics sau này

MVP hiện tại chưa chuyển hệ thống sang subtopic-first. Topic vẫn là lớp phân tích chính.
Subtopic analytics là lớp bổ sung để chỉ ra nhóm kiến thức nhỏ cần ôn lại, không thay thế topic stats.

## Topic taxonomy hiện tại

Slug topic chính đang dùng gồm:

- `ham-so`
- `nguyen-ham-tich-phan`
- `gioi-han`
- `mu-logarit`
- `xac-suat-to-hop`
- `vector-toa-do`
- `ma-tran`
- `hinh-hoc-khong-gian`

Ví dụ subtopic hiện tại:

- `dao-ham`
- `cuc-tri`
- `do-thi-ham-so`
- `logarit-co-ban`
- `phuong-trinh-logarit`
- `tich-phan-co-ban`
- `dinh-thuc-ma-tran`
- `goc-va-khoang-cach`

Slug topic/subtopic cần được giữ nhất quán giữa:

- `mockExams`
- seed
- JSON import
- recommendation / analytics services
