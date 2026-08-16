# Kiến trúc

## Kiến trúc hiện tại

ManMath hiện chỉ vận hành bằng V2.

```text
Trình duyệt
→ Next.js App Router
→ Express API
→ dịch vụ kiểm tra và chấm điểm V2
→ Prisma
→ PostgreSQL
```

Luồng làm đề chính:

```text
ExamVersion đã xuất bản
→ khám phá đề
→ làm bài V2
→ chấm điểm tại máy chủ
→ Attempt được ghim vào examVersionId
→ AttemptAnswer
→ ExamVersionQuestion chính tắc
→ biên nhận/xem lại/lịch sử/phân tích
```

Luồng luyện tập:

```text
ExamVersionQuestion đã xuất bản
→ DTO luyện tập không chứa đáp án
→ câu trả lời V2 thô
→ bộ kiểm tra/chuẩn hóa/chấm điểm dùng chung
→ kết quả chấm an toàn
→ không lưu Attempt
```

## Ranh giới giao diện

Các nhóm tuyến của Next.js tách biệt ngữ cảnh trình bày:

| Nhóm | Mục đích | Tuyến hiện tại |
| --- | --- | --- |
| `(public)` | Trang giới thiệu công khai | `/`, `/about` |
| `(workspace)` | Không gian có thanh bên và phần đầu trang | `/dashboard`, `/analytics`, `/history`, `/profile`, `/exams` |
| `(focus)` | Làm bài/xem lại/luyện tập không gây xao nhãng | `/exam-v2/[id]`, `/exam-v2/[id]/result`, `/exam-v2-preview/[id]`, `/practice/topic/[topicSlug]` |

`/exams` là tuyến chuyển hướng tương thích có chủ đích sang `/dashboard`; nó không chọn công cụ nội dung cũ.

Câu trả lời khi làm bài được gắn theo ID câu hỏi ổn định. Bản nháp trong bộ nhớ trình duyệt cũng dùng khóa `examId + examVersionId`, tránh việc câu trả lời của một phiên bản bị âm thầm dùng lại cho phiên bản khác. Dữ liệu kết quả trong phiên hỗ trợ điều hướng ngay lập tức, còn biên nhận/xem lại đã lưu trên máy chủ mới là nguồn bền vững.

## Ranh giới máy chủ

Đường đi của yêu cầu là route → middleware → controller → service. Lớp controller chuyển đổi đầu vào/lỗi HTTP; lớp service quản lý các bất biến về kiểm tra, chấm điểm, lưu dữ liệu và truy vấn V2.

- Khám phá đề chỉ đọc các đề có `ExamVersion` đã xuất bản.
- API đọc công khai dựng lại câu hỏi V2 đã lưu, kiểm tra hợp lệ rồi loại `answerKey`.
- Tạo bài làm kiểm tra đúng phiên bản đã xuất bản được yêu cầu, chấm đúng một lần và lưu trong một giao dịch cơ sở dữ liệu.
- Lịch sử và phân tích chỉ dùng các dữ kiện bài làm V2 hợp lệ.
- Đề xuất xếp hạng câu hỏi thuộc phiên bản V2 đã xuất bản dựa trên dữ kiện chủ đề yếu.
- Luyện tập chỉ khác làm đề ở việc không lưu bài làm.

## Mô hình miền

`Exam.id` là định danh logic ổn định của đề. `ExamVersion.versionNumber` xác định một bản nội dung cụ thể, có trạng thái `draft`, `published` hoặc `archived`.

Các loại câu hỏi được hỗ trợ:

- `single_choice`: ID câu hỏi và lựa chọn ổn định.
- `true_false_group`: ID câu hỏi và mệnh đề ổn định, có chấm điểm một phần.
- `short_answer`: chuẩn hóa theo chế độ chính xác, số hoặc số có sai số cho phép.

JSON đã lưu vẫn được coi là dữ liệu chưa đáng tin tại ranh giới miền. Bộ kiểm tra lúc chạy phải dựng lại một `QuestionInput` hợp lệ trước khi đọc công khai, chấm điểm, xuất bản hoặc sử dụng ảnh chụp dữ liệu.

`ScoreUnits` là số nguyên. Điểm số thực để hiển thị được suy ra từ đơn vị điểm; nó không phải nguồn sự thật cho việc chấm bài.

## Bất biến về phiên bản và lịch sử

- Trình nhập chỉ tạo hoặc thay thế bản nháp hiện tại.
- Khi xuất bản, hệ thống kiểm tra mức độ sẵn sàng, lưu trữ bản đã xuất bản trước đó và xuất bản bản nháp.
- Trình kích hoạt PostgreSQL ngăn sửa nội dung của phiên bản đã xuất bản/lưu trữ và dữ kiện chấm điểm đã nộp.
- Mỗi bài làm do hệ thống hiện tại tạo đều ghim chính xác `examVersionId` đã xuất bản.
- Mỗi `AttemptAnswer` tham chiếu một `ExamVersionQuestion` thuộc đúng phiên bản đã ghim.
- Ảnh chụp dữ liệu bất biến của bài làm giúp biên nhận/xem lại lịch sử tiếp tục chính xác sau khi phiên bản khác được xuất bản.

## Ranh giới bảo vệ đáp án

- DTO đề và luyện tập công khai không bao giờ chứa dữ liệu đáp án.
- Biên nhận an toàn cho người dùng đã xác thực/ẩn danh chứa câu trả lời đã nộp và dữ kiện chấm điểm, không chứa đáp án.
- Xem lại của chủ bài làm là endpoint xác thực tường minh và có thể trả DTO `correctAnswer` an toàn được suy ra từ ảnh chụp dữ liệu đã ghim.
- Ảnh chụp dữ liệu thô và đối tượng `answerKey` nội bộ không bao giờ đi qua ranh giới API.
- API chấm điểm công khai trả tính đúng/sai và điểm nên vẫn có thể bị dùng như công cụ dò đáp án; chính sách chống lạm dụng là vấn đề riêng với việc ngăn rò rỉ đáp án.

## Lý do thiết kế

Phiên bản bất biến ngăn việc sửa nội dung đã xuất bản làm thay đổi ý nghĩa của bài làm lịch sử. Ghim `examVersionId` giúp nội dung người dùng thực sự đã làm được xác định rõ. Quan hệ chính tắc `AttemptAnswer.examVersionQuestionId` ngăn việc coi số thứ tự hoặc chuỗi ID bên ngoài tái sử dụng là định danh cơ sở dữ liệu.

Chấm điểm tại máy chủ giúp luồng làm đề và luyện tập dùng chung một cách kiểm tra, chuẩn hóa và tính điểm. Việc loại đáp án khỏi DTO công khai ngăn rò rỉ ngoài ý muốn, còn DTO xem lại riêng cho chủ bài làm khiến quyết định hiển thị đáp án sau khi nộp có thể kiểm tra được.

Cơ sở dữ liệu kiểm thử cô lập tồn tại vì các bộ xác minh lưu dữ liệu, ghim phiên bản và bảo mật có chủ đích tạo hoặc đặt lại dữ liệu. Bộ bảo vệ yêu cầu đây phải là cơ sở dữ liệu khác và tên phải kết thúc bằng `_verify`.

## Bối cảnh lịch sử

Hệ thống ban đầu lưu các bản ghi `Question` bằng ID số, chỉ số lựa chọn và dữ liệu `correctAnswer` công khai. Trong thời gian chuyển đổi, hệ thống cũ và V2 cùng hoạt động, sử dụng các trường phân biệt `contentEngine`/`attemptFormat`. Mô hình song song đó đã ngừng: những trường này cùng bảng `Question` không còn trong lược đồ hiện tại.

Các file migration lịch sử vẫn nhắc đến những tên đó vì migration đã áp dụng là hồ sơ bất biến. Không sửa chúng chỉ để lịch sử trông giống kiến trúc hiện tại.

## Ghi chú học tập

- JSON truyền qua mạng không phải nguồn sự thật lúc chạy; nội dung PostgreSQL đã kiểm tra mới là nguồn sự thật.
- ID bên ngoài ổn định phù hợp làm định danh API, nhưng quan hệ cơ sở dữ liệu chính tắc vẫn cần khóa ngoại thật.
- Quy trình thêm → điền dữ liệu → xác minh → bắt buộc → loại bỏ an toàn hơn một migration phá hủy duy nhất.
- Luồng đọc lịch sử phải từ chối hoặc loại bản ghi sai cấu trúc, không tự tổng hợp dữ kiện chưa từng được lưu.
