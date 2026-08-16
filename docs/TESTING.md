# Kiểm thử và xác minh

## Kiểm tra thuần và kiểm tra bản dựng

Chạy từ `backend`:

```powershell
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run verify:exam-domain
npm run verify:exam-content-import
npm run verify:exam-publish-readiness
```

Chạy từ `frontend`:

```powershell
npm run type-check
npm run build
```

Kiểm tra khoảng trắng trong kho mã nguồn:

```powershell
git diff --check
```

## Xác minh với cơ sở dữ liệu cô lập

Các bộ xác minh lưu dữ liệu/bảo mật có chủ đích tạo dữ liệu. Chúng phải dùng cơ sở dữ liệu PostgreSQL có thể bỏ đi, không bao giờ dùng cơ sở dữ liệu phát triển hoặc triển khai thật.

Cấu hình phiên dòng lệnh hiện tại:

```powershell
$env:VERIFY_DATABASE_URL = 'postgresql://USER:PASSWORD@localhost:5432/manmath_db_verify?schema=public'
$env:VERIFY_DATABASE_CONFIRM = 'MANMATH_VERIFY_DB'
```

Bộ chạy lấy `DATABASE_URL` chính từ phiên dòng lệnh hoặc `backend/.env`, sau đó bắt buộc:

- URL xác minh tồn tại và hợp lệ;
- cơ sở dữ liệu đang dùng đúng bằng `VERIFY_DATABASE_URL`;
- URL xác minh khác URL chính;
- tên cơ sở dữ liệu kết thúc bằng `_verify`;
- giá trị xác nhận bằng `MANMATH_VERIFY_DB`;
- chế độ xác minh nội bộ được bật trước mọi thao tác đặt lại/ghi.

Chạy toàn bộ bộ xác minh:

```powershell
cd backend
npm run verify:isolated
```

Bộ chạy chỉ đặt lại/migration cơ sở dữ liệu có thể bỏ đi, nhập và xuất bản `src/test-fixtures/v2-minimal-exam.json`, chạy các bộ xác minh rồi luôn đặt lại cơ sở dữ liệu đó lần nữa trong khối `finally`.

Các mục tiêu riêng được hỗ trợ:

```powershell
npm run verify:isolated -- security-containment
npm run verify:isolated -- version-pinning
npm run verify:isolated -- draft-preview
npm run verify:isolated -- practice
npm run verify:isolated -- analytics
npm run verify:isolated -- attempt-persistence
npm run verify:isolated -- attempt-read
npm run verify:isolated -- history-immutability
```

Không chạy trực tiếp file triển khai bộ xác minh có thao tác ghi trên cơ sở dữ liệu dùng chung.

## Kiểm tra toàn vẹn dữ liệu lâu dài

Kiểm tra tham chiếu chính tắc chỉ đọc dữ liệu:

```powershell
cd backend
npm run audit:attempt-answer-v2-reference
```

Nó xác minh tham chiếu chính tắc đã được điền, không có bản ghi mồ côi, phiên bản/ID bên ngoài khớp và không trùng định danh câu hỏi trong cùng một bài làm.

## Xác minh đầu cuối

Bộ chạy Playwright phía giao diện dùng cùng cơ chế bảo vệ cơ sở dữ liệu cô lập, khởi động phía máy chủ/giao diện, chuẩn bị dữ liệu V2, chạy kiểm thử trình duyệt rồi đặt lại `_verify` sau cùng.

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

Phạm vi bao gồm ngăn lộ đáp án công khai, ba loại câu hỏi, tự động lưu/tải lại theo phiên bản, nộp bài và biên nhận an toàn.

## Danh sách kiểm tra nhanh thủ công

- Khám phá đề chỉ hiển thị đề đã xuất bản.
- `/exam-v2/[id]` hiển thị đúng KaTeX, tài nguyên, điều hướng, hai chế độ xem và đồng hồ.
- Nộp bài hoạt động cho cả người dùng đăng nhập và ẩn danh.
- Biên nhận/xem lại của chủ bài làm vẫn đúng sau khi tải lại và dùng phiên bản đã ghim.
- Khôi phục ẩn danh yêu cầu token biên nhận và không bao giờ lộ đáp án xem lại.
- Luyện tập chấm được cả ba loại câu mà không tạo bài làm.
- Lịch sử, phân tích và đề xuất phản ánh bài làm V2 của người dùng đã đăng nhập.
- Xem trước bản nháp yêu cầu email JWT đã xác minh nằm trong danh sách cho phép và không thể nộp bài.

## Bối cảnh lịch sử

Trong quá trình chuyển đổi, các bộ xác minh riêng từng kiểm tra việc hệ thống cũ/V2 cùng tồn tại và phân tích theo kiểu ước lượng. Những bất biến đó không còn. Kiểm tra hiện tại xác nhận khám phá đề chỉ dùng V2, định danh câu trả lời chính tắc, không quay lui tuyến cũ và ranh giới đáp án rõ ràng.
