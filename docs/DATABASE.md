# Database và Prisma

## Công nghệ và nguyên tắc

Runtime source of truth là PostgreSQL qua Prisma. JSON import chỉ là transport format. JSON columns trong `Question` và `AttemptAnswer` là persistence storage, không phải trusted domain object; V2 runtime validator chịu trách nhiệm xác nhận invariant trước khi content được read/graded.

## Models chính

### User, Topic, Subtopic và Exam

- `User`: Google/user identity, auth provider và attempts.
- `Topic`/`Subtopic`: taxonomy dùng cho content mapping và analytics. `Subtopic` thuộc một `Topic`.
- `Exam`: metadata, questions và attempts. `Exam.id` là stable string ID.

### Question

`Question.id: Int` là internal auto-increment database ID. Nó không phải V2 public identity.

| Nhóm | Fields |
| --- | --- |
| Common/legacy | `examId`, `order`, `topicId`, `subtopicId`, `question`, `imageUrl`, `explanation`, `options`, `optionImageUrls`, `correctAnswer` |
| V2 | `externalId`, `type`, `section`, `assets`, `choices`, `statements`, `answerKey` |

`externalId` là stable V2 domain/public ID và unique trong `examId`. V2 type là Prisma enum `single_choice`, `true_false_group` hoặc `short_answer`.

Legacy columns vẫn tồn tại: single-choice V2 import có thể materialize `options` và `correctAnswer` để compatibility, còn true/false/short-answer có `correctAnswer = null`. Không mô tả `Question.id` như stable external ID.

### Attempt

| Nhóm | Fields |
| --- | --- |
| Common | `examId`, nullable `userId`, `score`, counts, start/submission time, duration |
| V2 | nullable `scoringPolicy`, `scoreUnits`, `maxScoreUnits` |

V2 policy hiện tại là enum `vietnam_thpt_math_2025`. `score` được giữ như float compatibility value (`scoreUnits / 100`); V2 source of truth cho grading là policy và score units.

### AttemptAnswer

| Nhóm | Fields |
| --- | --- |
| Legacy | `questionId`, `selectedOptionIndex`, `correctOptionIndex`, `isCorrect` |
| V2 | `questionExternalId`, `questionType`, JSON `response`, `awardedScoreUnits`, `maxScoreUnits`, `isFullyCorrect` |

`questionId` là scalar indexed field. Schema hiện không khai báo relation/FK từ `AttemptAnswer` tới `Question`, nên docs không gọi nó là foreign key.

V2 persistence để option-index compatibility fields là `null`. Vì vậy legacy attempt-detail serializer chưa hoàn toàn compatible với V2 answers.

## Quan hệ Prisma

```text
User 1 --- n Attempt
Exam 1 --- n Question
Exam 1 --- n Attempt
Topic 1 --- n Question
Topic 1 --- n Subtopic
Subtopic 1 --- n Question
Attempt 1 --- n AttemptAnswer
```

`Exam → Attempt` và `Attempt → AttemptAnswer` dùng cascade delete. Attempt hiện không là immutable snapshot đầy đủ: nó không lưu toàn bộ question content, answer key hoặc explicit content version.

## V2 persistence flow

```text
Validated QuestionInput
→ Question V2 fields + JSON storage

Validated/graded attempt
→ transaction
→ Attempt scoring metadata
→ AttemptAnswer normalized response + per-question result
```

V2 read reconstruct raw objects từ persisted fields, validate lại rồi mới tạo public DTO. `answerKey` không được copy vào public response hoặc safe receipt.

## Legacy compatibility và debt

- `correctAnswer`, options và option indexes còn cần cho legacy endpoints/frontend.
- V1/V2 attempts cùng dùng tables chung để history/analytics hoạt động trong migration.
- Analytics hiện đọc `isCorrect`; partial true/false awarded units chưa có representation riêng.
- Exam versioning và immutable snapshot chưa hoàn chỉnh.
- Chỉ dùng một Question row per current content; future content edits có thể làm legacy review/read khác với thời điểm nộp attempt.

## Taxonomy

Topic/subtopic slug phải nhất quán giữa import, persistence và analytics. V2 importer kiểm tra question topic/subtopic reference và đảm bảo subtopic thuộc topic khai báo.
