# API

Địa chỉ gốc khi chạy cục bộ: `http://localhost:5000`. Tất cả tuyến được gắn bên dưới `/api`.

## Các tuyến công khai và vận hành hiện tại

| Phương thức | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/health` | Kiểm tra tiến trình còn hoạt động |
| `GET` | `/api/ready` | Kiểm tra PostgreSQL đã sẵn sàng |
| `GET` | `/api/exams` | Khám phá và lọc đề V2 đã xuất bản |
| `GET` | `/api/topics` | Dữ liệu chủ đề/chủ đề con dùng để lọc |
| `GET` | `/api/v2/exams/:id` | Nội dung đề đã xuất bản, không chứa đáp án |
| `POST` | `/api/v2/exams/:id/timing-sessions` | Bắt đầu phiên làm bài có thời gian do máy chủ xác lập |
| `GET` | `/api/v2/exam-timing-sessions/:sessionId` | Khôi phục phiên làm bài và thời hạn do máy chủ xác lập |
| `GET` | `/api/v2/practice/topic/:topicSlug` | Câu hỏi luyện tập V2 đã xuất bản |
| `POST` | `/api/v2/practice/grade` | Chấm bài luyện tập tại máy chủ mà không tạo `Attempt` |

Hai endpoint timing session dùng JWT nếu người dùng đã đăng nhập. Khi bắt đầu ẩn danh, response chỉ trả `anonymousTimingSessionToken` một lần; các lần đọc/submit sau phải gửi nó trong header `X-Exam-Timing-Session-Token`. Token này không được đặt trong URL hoặc log.

## Persistent practice (JWT)

| Phương thức | Endpoint | Mục đích |
| --- | --- | --- |
| `POST` | `/api/v2/practice/sessions` | Mở hoặc khôi phục phiên practice đang làm của chủ sở hữu |
| `GET` | `/api/v2/practice/sessions/active` | Lấy phiên đang làm, có thể lọc `topicSlug` |
| `GET` | `/api/v2/practice/sessions/:sessionId` | Khôi phục một phiên của chủ sở hữu |
| `PUT` | `/api/v2/practice/sessions/:sessionId/questions/:sessionQuestionId/response` | Lưu/clear một response với optimistic revision |
| `POST` | `/api/v2/practice/sessions/:sessionId/submit` | Chấm và hoàn tất phiên; cần `Idempotency-Key` |
| `POST` | `/api/v2/practice/sessions/:sessionId/cancel` | Hủy phiên còn `in_progress` |

Body mở phiên gồm `topicSlug`, `subtopicSlug` nullable, `questionCount` (`5` hoặc `10`) và `questionTypes`. Mỗi request lưu response gồm `response` (hoặc `null` để clear) và `expectedRevision`. Response session không chứa answer key; câu hỏi được ghim từ `ExamVersionQuestion` đã publish hoặc `QuestionBankItem` đã publish. Xem [LEARNING.md](LEARNING.md) và [QUESTION_BANK.md](QUESTION_BANK.md) về semantics.

`GET /api/exams` hỗ trợ `search`, `topic`, `subtopic`, `durationMin`, `durationMax`, `difficulty`, `year` và `source`. API này chỉ trả những đề có một `ExamVersion` V2 đã xuất bản.

DTO đề và luyện tập công khai dùng ID chuỗi ổn định cùng cấu trúc câu hỏi phân biệt theo loại. Chúng không chứa `answerKey`, ID lựa chọn đúng, đáp án đúng/sai, đáp án ngắn kỳ vọng hoặc sai số cho phép.

## Các tuyến bài làm và xem lại

| Phương thức | Endpoint | Xác thực | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/api/v2/exams/:id/attempts` | JWT hoặc token phiên ẩn danh | Chấm và lưu bài làm được ghim vào một phiên bản và phiên thời gian |
| `GET` | `/api/v2/attempts/:attemptId` | JWT của chủ bài làm | Biên nhận an toàn dành cho chủ bài làm |
| `GET` | `/api/v2/attempts/:attemptId/anonymous-receipt` | Token biên nhận trong phần đầu HTTP | Biên nhận an toàn cho người dùng ẩn danh |
| `GET` | `/api/v2/attempts/:attemptId/review` | JWT của chủ bài làm | Xem lại dựa trên ảnh chụp dữ liệu, có đáp án đúng an toàn |

Dữ liệu tạo bài làm gồm `examVersionId`, `timingSessionId` và `responses` thô; header `Idempotency-Key` là bắt buộc. Máy chủ tính `durationSeconds` từ thời điểm bắt đầu của phiên thời gian; trình khách không cung cấp giá trị thời gian có thẩm quyền. Phiên bản phải là bản đang được xuất bản và khả dụng. Bài làm cùng các câu trả lời được lưu trong một giao dịch cơ sở dữ liệu. Route này có rate limit process-local: mỗi phạm vi user/IP trong 60 giây tối đa 60 request và 12 idempotency key mới; multi-instance cần limiter dùng chung khi triển khai.

Khi tạo bài làm ẩn danh, máy chủ chỉ trả token biên nhận thô đúng một lần. Cơ sở dữ liệu chỉ lưu giá trị băm và thời điểm hết hạn sau bảy ngày. Khi khôi phục, trình khách gửi token trong `X-Attempt-Receipt-Token`; tuyệt đối không đặt token vào URL hoặc nhật ký. Bài làm ẩn danh không được truy cập phần xem lại dành cho chủ bài làm.

Biên nhận an toàn không chứa đáp án, lời giải, ảnh chụp dữ liệu thô hoặc giá trị băm của token. Phần xem lại của chủ bài làm là ranh giới chủ động cho phép hiển thị đáp án và trả một `correctAnswer` tường minh theo từng loại câu, thay vì trả ảnh chụp dữ liệu nội bộ.

## Xem trước bản nháp nội bộ

| Phương thức | Endpoint | Xác thực | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/v2/internal/exam-previews/:id` | JWT + danh sách email phía máy chủ | Xem trước bản nháp mới nhất mà không lộ đáp án |

Việc phân quyền dùng email từ JWT đã xác minh và danh sách `DRAFT_PREVIEW_AUTHORIZED_EMAILS` đã chuẩn hóa. Không tin email do trình khách trực tiếp cung cấp. Xem trước bản nháp chỉ cho phép đọc và không làm nội dung nháp trở thành công khai.

## Xác thực

| Phương thức | Endpoint | Xác thực | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/api/auth/google` | Công khai | Xác minh thông tin Google và cấp JWT của ManMath |
| `GET` | `/api/auth/me` | JWT | Đọc người dùng hiện tại |

## Phân tích và lịch sử người dùng

| Phương thức | Endpoint | Xác thực | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/me/topic-stats` | JWT | Phân tích `ScoreUnits` theo chủ đề |
| `GET` | `/api/me/subtopic-stats` | JWT | Phân tích `ScoreUnits` theo chủ đề con |
| `GET` | `/api/me/recommendations` | JWT | Chủ đề yếu và đề V2 đã xuất bản được đề xuất |
| `GET` | `/api/me/progress` | JWT | Tổng quan, bài làm gần đây và xu hướng tiến bộ |
| `GET` | `/api/me/learning-overview` | JWT | Mastery, confidence, corpus coverage, activity, continue item và next action |
| `GET` | `/api/me/attempts` | JWT | Lịch sử bài làm V2 có phân trang |

Lịch sử nhận `page`, `limit`, `examId` tùy chọn và `sort=latest`; giới hạn tối đa là 50.

## Ý nghĩa lỗi

- `400`: truy vấn, nội dung yêu cầu hoặc cấu trúc câu trả lời không hợp lệ.
- `401`: thiếu JWT bắt buộc hoặc JWT không hợp lệ.
- `403`: đã xác thực nhưng không có quyền xem trước nội bộ.
- `404`: không có nội dung đã xuất bản, chủ đề, bài làm hoặc tài nguyên được phép truy cập.
- `409`: bài làm đã lưu nhưng thiếu dữ kiện/ảnh chụp dữ liệu V2 tương thích để xem lại; hoặc response revision/trạng thái persistent practice xung đột.
- `422`: cấu hình practice hợp lệ nhưng không chọn được câu phù hợp.
- `429`: vượt rate limit nộp bài.
- `413`: nội dung JSON vượt quá 1 MB.
- `500`: nội dung V2 hoặc dữ kiện bài làm đã lưu không vượt qua kiểm tra toàn vẹn.
- `503`: cơ sở dữ liệu chưa sẵn sàng.

## Bối cảnh lịch sử

Các endpoint đã ngừng hoạt động như `/api/exam/submit`, `/api/practice/topic/:topicSlug` và `/api/exams/:id` kiểu cũ không còn được gắn vào hệ thống định tuyến. Hợp đồng dùng ID số/chỉ số lựa chọn trước đây chỉ mang tính lịch sử. Thiết kế API hiện tại không được thêm cơ chế quay lui cho chúng.

Nhập và xuất bản nội dung là quy trình dòng lệnh, không phải API HTTP. Xem [IMPORT_JSON.md](IMPORT_JSON.md).
