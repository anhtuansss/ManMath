# Kiến trúc ManMath

## Current V2 boundary

Logical `Exam` owns immutable published `ExamVersion` records; legacy `Question` is not V2 source of truth. Import mutates drafts, readiness publishes, public read/grade/attempt use only the exact published version, and attempts persist that `examVersionId` plus a validated snapshot.

Public V2 DTOs and safe receipts strip answer keys. Owner-only review reads answer material from the immutable attempt snapshot. Anonymous recovery uses a seven-day hash-backed token for safe receipt only, never review. Legacy readers refuse V2 exams with `409`; legacy practice excludes V2 rows; V2 discovery reads published version questions.

## System Overview

```text
Browser → Next.js App Router → Express API → Prisma → PostgreSQL
```

Frontend phụ trách presentation, browser storage cho flow làm đề và gọi API. Backend tổ chức route → middleware → controller → service. Prisma là lớp truy cập PostgreSQL.

ManMath đang ở trạng thái migration: legacy exam architecture vẫn phục vụ flow chính, còn V2 là content domain và exam engine song song.

## Frontend Architecture

Frontend dùng Next.js App Router, TypeScript, Tailwind CSS và KaTeX. Route groups tách layout theo ngữ cảnh:

| Route group | Trách nhiệm | Routes |
| --- | --- | --- |
| `(public)` | Nội dung công khai, không phụ thuộc backend để render landing | `/`, `/about` |
| `(workspace)` | App shell với sidebar/header; guest vẫn xem được các màn có state phù hợp | `/dashboard`, `/analytics`, `/history`, `/profile`, `/exams` |
| `(focus)` | Flow cần tập trung, không có workspace sidebar/header | `/exam/[id]`, `/exam/[id]/result`, `/exam-v2/[id]`, `/exam-v2/[id]/result`, `/exam/[id]/attempts`, `/attempts/[attemptId]`, `/practice/topic/[topicSlug]` |

`/exams` là compatibility route redirect về `/dashboard`.

### Legacy frontend flow

Dashboard, recommendation, history và profile vẫn điều hướng đến `/exam/[id]`. Flow này gọi legacy public detail API, lưu answer/timer ở `localStorage`, submit tới API V1 và lưu result session để render review. Legacy result có thể hiển thị đáp án đúng và explanation vì legacy API vẫn trả các field đó.

### V2 frontend flow

`/exam-v2/[id]` tải public V2 content. Answer state được key bằng stable string `question.id`; single choice dùng `choiceId`, true/false dùng `StatementId → boolean`, short answer dùng raw string. Draft và thời gian còn lại được autosave trong `localStorage`.

Submit V2 gọi create-attempt API. Result tạm thời nằm trong `sessionStorage`; nếu người dùng đã đăng nhập, result page có thể tải lại owner receipt từ backend. V2 result hiện chỉ hiển thị điểm/receipt, chưa reveal answer key hoặc explanation.

## Backend Architecture

Backend dùng Express, TypeScript, PostgreSQL và Prisma.

- Legacy services phục vụ exam list/detail, submit, practice, attempt detail, analytics và recommendation.
- V2 services phục vụ validated content read, grading, attempt persistence và owner receipt.
- Runtime validation là boundary chuyển JSON/database storage thành trusted V2 domain objects.
- Legacy API chưa được loại bỏ vì frontend và analytics compatibility vẫn còn sử dụng nó.

## Domain Model

V2 có ba type trong discriminated union:

- `single_choice`: bốn choices, mỗi choice có stable `ChoiceId`.
- `true_false_group`: bốn statements, mỗi statement có stable `StatementId`.
- `short_answer`: đáp án exact, numeric hoặc numeric-with-tolerance.

`Question.id` trong V2 domain là stable string external ID. Nó khác với `Question.id: Int` nội bộ của Prisma. `externalId` được unique theo phạm vi một exam và là public/domain identity dùng trong API, answer state và persistence V2.

`RawSubmittedResponse` chưa đáng tin cậy. Sau validation, nó trở thành normalized `SubmittedResponse`; short answer được chuẩn hóa trước khi grade. `ScoreUnits` là đơn vị nguyên dùng cho policy scoring, không phải điểm float trực tiếp.

## Data Flow

### V2 public read

```text
Persisted V2 Question
→ reconstruct raw domain object
→ runtime validate
→ trusted QuestionInput
→ remove answerKey
→ PublicQuestion
```

JSON fields trong Prisma chỉ là persistence storage. Chúng không tự động trở thành domain object đáng tin cậy; validator đảm bảo invariant về type, section, IDs, choices/statements, answer key và taxonomy references.

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
RawSubmittedResponse[]
→ validate ownership in exam + type + payload
→ normalize response
→ gradeQuestion
→ GradeExamContentResponseDto
```

Backend là source of truth cho grading. Response cho biết correctness và awarded score của submission, nhưng không trả answer key.

### V2 persisted attempt

```text
Validated exam + graded attempt
→ Prisma transaction
→ Attempt
→ AttemptAnswer[]
→ authenticated owner receipt
```

Create attempt có optional JWT: guest attempt vẫn được persist nhưng không có owner và không thể tải lại bằng receipt endpoint. Receipt V2 chỉ dành cho authenticated owner.

## Persistence Model

PostgreSQL là runtime source of truth. `Question.id` là internal auto-increment ID; `externalId` là V2 stable identity. Question vẫn giữ legacy columns như `options` và `correctAnswer` trong giai đoạn coexist, đồng thời có V2 fields `type`, `section`, `assets`, `choices`, `statements` và `answerKey`.

Attempt V2 lưu `scoringPolicy`, `scoreUnits`, `maxScoreUnits`; mỗi `AttemptAnswer` lưu external ID, type, normalized response, awarded/max score units và `isFullyCorrect`. Compatibility columns `selectedOptionIndex` và `correctOptionIndex` có thể là `null` cho V2.

`AttemptAnswer.questionId` là scalar field có index, không được khai báo Prisma relation/FK tới `Question`.

## API V1 vs V2

V1 dùng numeric question IDs, option indices và `correctAnswer`. Nó là flow legacy, vẫn active và có answer-key leakage trên public exam detail.

V2 dùng stable external IDs và typed responses. Public V2 content không trả answer key; grading, persistence và receipt là API riêng. V2 frontend hiện tồn tại song song và chưa là default route từ dashboard.

## Auth and Ownership

Google credential được backend verify, sau đó backend phát hành JWT ManMath. JWT bảo vệ history, legacy attempt detail, analytics, profile data và V2 owner receipt.

V1 submit và V2 create attempt dùng optional auth: request anonymous vẫn được xử lý/persist, nhưng history và receipt chỉ thuộc user có JWT hợp lệ.

## Content Import Pipeline

JSON là transport/import format; PostgreSQL là runtime source. Legacy importer dùng legacy question shape và hỗ trợ manifest batch. V2 importer yêu cầu `schemaVersion: 2`, taxonomy và V2 domain question shape; mặc định là dry-run, chỉ ghi database khi thêm `--write`.

Cả hai pipeline validate dữ liệu trước khi ghi. V2 import thực hiện upsert trong một Prisma transaction. OCR, AI parsing, Word/PDF/Excel import và admin upload chưa được implement.

## Scoring Architecture

Policy hiện tại là `vietnam_thpt_math_2025`. Chi tiết score units, true/false partial scoring và distinction giữa policy maximum với attempt maximum nằm tại [SCORING.md](SCORING.md).

## Security Boundaries

- Public V2 exam read không trả `answerKey`, `correctAnswer`, `correctChoiceId`, true/false answer values, short-answer expected value hoặc tolerance.
- V2 receipt cũng không trả answer key/explanation.
- Legacy public detail vẫn trả `correctAnswer`; đây là debt đã biết, không phải behavior của V2.
- V2 grade endpoint public không trả key trực tiếp, nhưng correctness/score response có thể bị xem như grading oracle nếu không có policy/rate limiting bổ sung.
- Review-answer reveal V2 chưa được thiết kế và được deferred.

## Known Technical Debt

- V1/V2 coexist; dashboard và recommendation chưa chọn V2 route.
- Legacy API vẫn expose correct answers.
- Exam/content versioning chưa hoàn chỉnh.
- Attempt không giữ immutable snapshot của toàn bộ question/content/answer key.
- V2 attempt xuất hiện trong shared history/analytics, nhưng legacy attempt detail cần option-index fields và chưa compatible hoàn chỉnh với V2 null fields.
- Analytics hiện dùng `isCorrect`/`isFullyCorrect`; partial score true/false chưa được diễn giải riêng.
- V2 review/reveal policy, explanation reveal và long-term receipt UX chưa hoàn thiện.

## Deferred Architecture

Authentication enhancements, admin content management, OCR/AI import, AI tutor, payment, leaderboard, social features và mobile app nằm ngoài MVP hiện tại.
