# Cơ sở dữ liệu và Prisma

## Lược đồ hiện tại

PostgreSQL thông qua Prisma là nguồn sự thật khi hệ thống vận hành. File JSON chỉ là phương tiện nhập; các cột JSON phải được kiểm tra trước khi trở thành dữ liệu miền đáng tin cậy.

### Nội dung và phân loại

- `Exam`: định danh logic ổn định và siêu dữ liệu dùng để khám phá đề.
- `ExamVersion`: bản nội dung được đánh số, có trạng thái `draft`, `published` hoặc `archived`.
- `ExamVersionQuestion`: ID bên ngoài ổn định của câu hỏi cùng toàn bộ nội dung có kiểu trong một phiên bản.
- `Topic` và `Subtopic`: hệ thống phân loại dùng khi nhập nội dung, khám phá đề, luyện tập và phân tích.

Các ràng buộc quan trọng:

- `ExamVersion` là duy nhất theo `(examId, versionNumber)`.
- `ExamVersionQuestion` là duy nhất theo `(examVersionId, externalId)` và `(examVersionId, order)`.
- Phiên bản đã xuất bản/lưu trữ cùng câu hỏi của chúng được trình kích hoạt cơ sở dữ liệu bảo vệ tính bất biến.
- Khi xuất bản, hệ thống lưu trữ phiên bản đã xuất bản trước đó thay vì sửa nó.

### Bài làm

- `Attempt.examVersionId` ghim phiên bản được nộp trong mọi lần ghi của hệ thống hiện tại.
- `Attempt` lưu chính sách chấm điểm, tổng `ScoreUnits`, số lượng, thời gian làm và ảnh chụp nội dung bất biến đã được kiểm tra.
- `AttemptAnswer.examVersionQuestionId` là bắt buộc và dùng `ON DELETE RESTRICT`.
- `(attemptId, examVersionQuestionId)` là duy nhất.
- `questionExternalId` vẫn là dữ kiện tham chiếu miền ổn định; nó không thay thế khóa ngoại chính tắc.
- Trình kích hoạt cơ sở dữ liệu bảo vệ dữ kiện chấm điểm của bài làm và câu trả lời sau khi nộp.

Một số cột điểm/ảnh chụp dữ liệu/phiên bản của `Attempt` vẫn cho phép null ở mức vật lý vì chúng được thêm theo từng giai đoạn. Luồng đọc V2 kiểm tra toàn bộ tập dữ kiện bắt buộc rồi loại hoặc từ chối bản ghi sai cấu trúc; hệ thống không dựng lại dữ kiện còn thiếu.

## Tổng quan quan hệ

```text
User 1 ── n Attempt
Exam 1 ── n ExamVersion
Exam 1 ── n Attempt
ExamVersion 1 ── n ExamVersionQuestion
ExamVersion 1 ── n Attempt
Attempt 1 ── n AttemptAnswer
ExamVersionQuestion 1 ── n AttemptAnswer
Topic 1 ── n Subtopic
```

Với mỗi câu trả lời hợp lệ:

```text
Attempt.examVersionId
== AttemptAnswer.examVersionQuestion.examVersionId

AttemptAnswer.questionExternalId
== AttemptAnswer.examVersionQuestion.externalId
```

## Ảnh chụp dữ liệu (snapshot) và xem lại

`examContentSnapshot` lưu nội dung đã kiểm tra tại thời điểm nộp, bao gồm dữ liệu đáp án chỉ dành cho máy chủ. Ảnh chụp dữ liệu này giúp xem lại lịch sử không phụ thuộc vào các lần tạo nháp/xuất bản sau đó. Không API nào được trả nội dung ảnh chụp thô.

Biên nhận an toàn ánh xạ dữ kiện câu trả lời đã lưu mà không lộ đáp án. Phần xem lại của chủ bài làm kiểm tra ảnh chụp dữ liệu và trả một DTO `correctAnswer` an toàn, tường minh.

## Phiên thời gian, persistent practice và Question Bank

- `ExamTimingSession` ghim `examId` và `examVersionId`, ghi `startedAt`/`expiresAt` do máy chủ xác lập. Nó thuộc `User` khi có JWT, hoặc lưu băm token ẩn danh; token thô không nằm trong database.
- `Attempt.timingSessionId` là duy nhất khi có giá trị, nên một timing session chỉ tạo một attempt.
- `PracticeSession` thuộc một `User`, ghim taxonomy/cấu hình, seed chọn câu, trạng thái `in_progress`, `completed` hoặc `cancelled`, và kết quả sau khi nộp.
- `PracticeSessionQuestion` phải tham chiếu chính xác một nguồn: `ExamVersionQuestion` hoặc `QuestionBankItem`; hai FK nguồn dùng `RESTRICT`.
- `PracticeSessionAnswer` lưu response đã chuẩn hóa, `responseRevision` cho optimistic concurrency và facts chấm điểm sau khi session hoàn tất.
- `QuestionBankImportBatch` là biên nhận import theo `externalId`. `QuestionBankItem` có `logicalKey`, `revision`, provenance/content fingerprint và trạng thái `draft`, `published`, `archived`.

Trigger cơ sở dữ liệu bảo vệ item Question Bank đã publish/archived và practice result đã chấm. Xem [QUESTION_BANK.md](QUESTION_BANK.md) và [LEARNING.md](LEARNING.md).

## Lưu điểm

`scoreUnits`, `maxScoreUnits` và `scoringPolicy` là dữ kiện chấm điểm. `score` là giá trị trình bày/tổng hợp được suy ra (`scoreUnits / 100`) và còn được giữ trong mô hình hiện tại; chấm điểm và phân tích không suy luận tính đúng/sai từ số thực này.

## Vòng đời nội dung

```text
JSON đã kiểm tra
→ các bản ghi ExamVersion + ExamVersionQuestion ở trạng thái nháp
→ kiểm tra mức độ sẵn sàng
→ phiên bản đã xuất bản và bất biến
→ đọc công khai / làm đề / luyện tập
```

Trình nhập có thể thay câu hỏi của bản nháp trong một giao dịch cơ sở dữ liệu. Nó không bao giờ sửa câu hỏi đã xuất bản. Xem [CONTENT_IMPORT.md](CONTENT_IMPORT.md).

## Vòng đời Question Bank

Question Bank có vòng đời song song với ExamVersion: JSON đã validate → `QuestionBankImportBatch` + item draft → publish theo batch → item published/immutable → practice session ghim item. Import revision mới archive item published cùng `logicalKey`, không xóa item mà session đang tham chiếu.

## Bối cảnh lịch sử

Lược đồ đã ngừng sử dụng trước đây có bảng `Question` với ID số, `Exam.contentEngine`, `AttemptAnswer.questionId` dạng số thứ tự và các chỉ số lựa chọn đã chọn/đúng. Việc dọn dẹp dùng migration theo giai đoạn:

1. Thêm `examVersionQuestionId` cho phép null và điền dữ liệu từ `examVersionId + questionExternalId` đã ghim.
2. Chuyển trường này thành bắt buộc và duy nhất trong mỗi bài làm.
3. Loại `questionId` dạng số thứ tự.
4. Xóa `Question`, `contentEngine` và các trường chỉ số lựa chọn sau bước kiểm tra trước và xác minh cô lập.

Những tên này vẫn tồn tại trong SQL migration đã áp dụng vì không được sửa lịch sử migration. Chúng không thuộc lược đồ Prisma hiện tại.

## Quy tắc vận hành

- Không bao giờ sửa migration đã áp dụng.
- Không bao giờ đặt lại cơ sở dữ liệu đang chứa bài làm cần bảo toàn.
- Kiểm tra `prisma migrate status` và chênh lệch giữa lược đồ với cơ sở dữ liệu trước khi xử lý sai lệch.
- Sao lưu và thử quy trình khôi phục trước khi migration trên môi trường triển khai thật.
- Duy trì `audit:attempt-answer-v2-reference` như một kiểm tra toàn vẹn chính tắc lâu dài.
