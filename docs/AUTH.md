# Xác thực và phân quyền

## Luồng hiện tại

ManMath dùng đăng nhập Google ở giao diện. Máy chủ xác minh thông tin Google, tìm hoặc tạo người dùng rồi cấp JWT của ManMath.

```text
Thông tin xác thực Google
→ POST /api/auth/google
→ máy chủ xác minh với Google
→ tìm/tạo User
→ JWT của ManMath
→ Authorization: Bearer <token>
```

JWT chỉ chứa định danh nội bộ tối thiểu (`userId`, `email`). Thông tin xác thực Google ban đầu không được tái sử dụng làm token phiên của ứng dụng.

## Ranh giới lớp trung gian (middleware)

`authMiddleware` yêu cầu JWT hợp lệ và bảo vệ:

- `/api/auth/me`;
- toàn bộ API lịch sử/phân tích/đề xuất `/api/me/*`;
- biên nhận và phần xem lại dành cho chủ bài làm;
- xem trước bản nháp nội bộ trước bước kiểm tra danh sách cho phép.

`optionalAuthMiddleware` được dùng khi tạo timing session và bài làm V2. Token hợp lệ sẽ gán chủ sở hữu; khi không có token, luồng khách vẫn ẩn danh.

Toàn bộ persistent practice API dùng `authMiddleware`: session, response và kết quả chỉ thuộc user tạo nó.

Khám phá đề, đọc đề công khai và practice nhanh không yêu cầu JWT. Persistent practice luôn yêu cầu JWT. Công khai không đồng nghĩa với việc đáp án bị lộ.

## Quyền sở hữu và khôi phục bài làm ẩn danh

Truy vấn biên nhận/xem lại của chủ bài làm dùng cả ID bài làm và ID người dùng đã xác thực. Người dùng khác nhận cùng phản hồi không khả dụng như khi bài làm không tồn tại.

Bài làm ẩn danh nhận token biên nhận thô dùng một lần. PostgreSQL chỉ lưu giá trị băm và thời điểm hết hạn sau bảy ngày. Trình khách gửi token thô trong `X-Attempt-Receipt-Token`; token không được xuất hiện trong URL hoặc nhật ký. Khôi phục ẩn danh chỉ trả biên nhận an toàn và không được truy cập phần xem lại của chủ bài làm.

Timing session ẩn danh có token khác: response khởi tạo chỉ trả `anonymousTimingSessionToken` một lần, database chỉ lưu băm. Trình khách phải gửi nó trong `X-Exam-Timing-Session-Token` khi khôi phục timing session hoặc nộp bài. Nó không thay thế token biên nhận và không được đặt trong URL/log.

## Xem trước bản nháp nội bộ

Xem trước bản nháp yêu cầu:

1. JWT ManMath đã xác minh;
2. email trong JWT nằm trong danh sách phía máy chủ `DRAFT_PREVIEW_AUTHORIZED_EMAILS` đã chuẩn hóa.

Email cấu hình và email từ JWT đã xác minh đều được bỏ khoảng trắng thừa và chuyển thành chữ thường trước khi so sánh. Không tin bất kỳ email nào do trình khách trực tiếp cung cấp. Danh sách trống sẽ từ chối mọi quyền xem trước.

## Biến môi trường

Máy chủ:

- `DATABASE_URL` — bắt buộc.
- `GOOGLE_CLIENT_ID` — bắt buộc.
- `JWT_SECRET` — bắt buộc và chỉ dùng phía máy chủ.
- `JWT_EXPIRES_IN` — tùy chọn, mặc định `7d`.
- `DRAFT_PREVIEW_AUTHORIZED_EMAILS` — tùy chọn, danh sách email nội bộ phân tách bằng dấu phẩy.
- `CORS_ORIGIN` — danh sách cho phép phân tách bằng dấu phẩy; bắt buộc ở môi trường triển khai thật.
- `PORT` — tùy chọn, mặc định `5000`.

Giao diện:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

Không bao giờ đưa `DATABASE_URL`, `JWT_SECRET`, đáp án hoặc token biên nhận vào các biến `NEXT_PUBLIC_*`.

## Lưu ý bảo mật

- Không đưa `.env` hoặc `.env.local` vào commit.
- Không ghi thông tin xác thực, JWT, token biên nhận, token timing ẩn danh hoặc nội dung yêu cầu nộp bài vào nhật ký.
- Phản hồi công khai/luyện tập luôn loại dữ liệu đáp án.
- Xem lại của chủ bài làm là quyền có chủ đích và dựa trên ảnh chụp dữ liệu.
- API chấm điểm công khai tiết lộ tính đúng/sai và điểm, nên tương lai có thể cần chính sách chống lạm dụng/giới hạn tần suất.

## Phạm vi để sau

Lược đồ vẫn giữ các trường liên quan đến mật khẩu cho khả năng mở rộng định danh sau này, nhưng hiện không có API đăng nhập email/mật khẩu, token làm mới hoặc quản lý mật khẩu. Vai trò nhân sự lưu trong cơ sở dữ liệu cũng để sau; xem trước bản nháp hiện dùng danh sách cho phép phía máy chủ.
