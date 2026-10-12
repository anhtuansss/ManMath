# Quy trình triển khai

Quy trình này không phụ thuộc nhà cung cấp. Việc chọn nền tảng lưu trữ, sao lưu và PostgreSQL được quản lý thuộc quyết định của người vận hành.

## Môi trường bắt buộc

Máy chủ:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`
- `NODE_ENV=production`
- `CORS_ORIGIN` phân tách bằng dấu phẩy
- `JWT_EXPIRES_IN`, `PORT`, `DRAFT_PREVIEW_AUTHORIZED_EMAILS` là tùy chọn

Giao diện:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` khi bật đăng nhập Google

Không bao giờ để lộ bí mật cơ sở dữ liệu/JWT, đáp án hoặc token biên nhận ẩn danh trong cấu hình trình khách, URL, nhật ký hay đầu ra bản dựng.

## Trình tự phát hành

1. Sao lưu PostgreSQL và xác minh quy trình/quyền sở hữu khôi phục bên ngoài kho mã nguồn này.
2. Chạy `npm ci` trong thư mục `backend` và `frontend`.
3. Chạy các bước kiểm tra trong [TESTING.md](TESTING.md), gồm toàn bộ bộ xác minh cô lập trên cơ sở dữ liệu `_verify` có thể bỏ đi.
4. Chạy `npx prisma migrate status`, kiểm tra sai lệch bất thường, sau đó chạy `npx prisma migrate deploy` từ `backend`.
5. Tạo bản dựng frontend với URL backend của môi trường triển khai thật.
6. Khởi động backend và kiểm tra `/api/health` cùng `/api/ready`.
7. Kiểm tra nhanh khám phá đề đã xuất bản, timing/submit V2, biên nhận/xem lại của chủ bài làm đã đăng nhập, biên nhận an toàn ẩn danh, practice nhanh, Learning Overview, lịch sử, phân tích và đề xuất. Persistent practice UI chưa có route được mount; chỉ kiểm tra API nếu nó nằm trong phạm vi release.
8. Theo dõi lỗi ứng dụng và dung lượng PostgreSQL mà không ghi nội dung nộp bài hoặc thông tin xác thực vào log.

Không bao giờ sửa migration đã áp dụng hoặc đặt lại cơ sở dữ liệu triển khai thật/phát triển để né vấn đề lịch sử migration.

## Quay lui

Chỉ quay lui mã ứng dụng khi giả định lược đồ của phiên bản cũ vẫn tương thích. Quay lui lược đồ cần kế hoạch bảo toàn dữ liệu rõ ràng; không xóa phiên bản hoặc bài làm như một cách quay lui tình thế. Với sự cố phá hủy dữ liệu, hãy khôi phục từ bản sao lưu đã kiểm thử thay vì vội vàng tự viết SQL đảo ngược.

## Bối cảnh lịch sử

Quá trình chuyển sang chỉ dùng V2 từng dùng các bước tạo chênh lệch/thực thi/đánh dấu đã áp dụng có kiểm soát khi cơ sở dữ liệu phát triển hiện hữu gặp trạng thái checksum lịch sử. Đó là biện pháp khôi phục riêng cho cơ sở dữ liệu, không phải quy trình triển khai mặc định. Triển khai thông thường phải giữ lịch sử migration bất biến và dùng `migrate deploy`.
