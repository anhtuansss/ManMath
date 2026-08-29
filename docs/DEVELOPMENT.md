# Quy trình phát triển

## Dịch vụ cục bộ

Phía máy chủ:

```powershell
cd backend
npm install
npx prisma migrate dev
npm run dev
```

Phía giao diện:

```powershell
cd frontend
npm install
npm run dev
```

Các lệnh tắt ở thư mục gốc là `npm run dev:backend`, `npm run dev:frontend` và `npm run build:frontend`.

Các biến môi trường bắt buộc được mô tả trong [AUTH.md](AUTH.md). Không đưa file môi trường cục bộ vào commit.

## Ranh giới phát triển

- Giữ nguyên phân tách route → middleware → controller → service trong mã nguồn.
- Coi JSON từ cơ sở dữ liệu và nội dung yêu cầu là chưa đáng tin cho đến khi được kiểm tra.
- Tái sử dụng miền chấm điểm/chuẩn hóa V2 cho cả làm đề và luyện tập.
- Tách ánh xạ DTO công khai/luyện tập khỏi ánh xạ xem lại có phân quyền của chủ bài làm.
- Dùng ID bên ngoài ổn định trong API/trạng thái trình duyệt và quan hệ Prisma chính tắc khi lưu dữ liệu.
- Không bao giờ sửa phiên bản đã xuất bản; hãy nhập bản nháp tiếp theo rồi xuất bản.
- Không thêm cơ chế tương thích quay lui cho tuyến hoặc lược đồ đã ngừng sử dụng.

## Quy trình nội dung

```powershell
cd backend
npm run import:exam-content -- ./src/data/import/2026-06-11-bo-gddt-viet-nam-tot-nghiep-001.json
npm run import:exam-content -- ./src/data/import/2026-06-11-bo-gddt-viet-nam-tot-nghiep-001.json --write
npm run publish:exam-content -- 2026-06-11-bo-gddt-viet-nam-tot-nghiep-001
```

Xem [IMPORT_JSON.md](IMPORT_JSON.md) và [CONTENT_IMPORT.md](CONTENT_IMPORT.md).

Question Bank là luồng riêng; dry-run trước khi ghi:

```powershell
cd backend
npm run import:question-bank -- <json-path>
npm run import:question-bank -- <json-path> --write
npm run publish:question-bank -- <batch-id>
npm run audit:practice-corpus
npm run verify:practice-assets
```

Xem [QUESTION_BANK.md](QUESTION_BANK.md) về contract và revision.

## Quy trình Prisma

```powershell
cd backend
npx prisma validate
npx prisma migrate status
npx prisma migrate dev
npx prisma studio
```

Quy tắc:

- Kiểm tra trước dữ liệu và quan hệ phụ thuộc trước khi thay đổi lược đồ có tính phá hủy.
- Dùng migration theo giai đoạn thêm/điền dữ liệu/xác minh/loại bỏ khi có liên quan đến định danh hoặc lịch sử.
- Không sửa migration đã áp dụng.
- Không dùng `prisma migrate reset` trên cơ sở dữ liệu có bài làm/nội dung cần giữ.
- Tên migration lịch sử có thể nhắc đến lược đồ đã ngừng dùng; `schema.prisma` hiện tại mới là nguồn xác định cấu trúc đang có.

Nếu cơ sở dữ liệu hiện hữu báo checksum lịch sử không khớp, không che giấu bằng cách viết lại lịch sử hoặc đặt lại dữ liệu. Hãy xác định chính xác chênh lệch lược đồ, kiểm tra SQL được tạo, chỉ áp dụng thao tác đã duyệt rồi cập nhật trạng thái migration một cách tường minh.

## Quy trình xác minh

Chạy kiểm tra kiểu và bản dựng cho thay đổi thông thường. Dùng bộ chạy cô lập có bảo vệ cho mọi bộ xác minh tạo người dùng, phiên bản, bài làm hoặc câu trả lời.

```powershell
cd backend
npx tsc --noEmit
npx prisma validate
npm run verify:isolated
```

```powershell
cd frontend
npm run type-check
npm run build
```

Các lệnh đầy đủ và hành vi bảo vệ nằm trong [TESTING.md](TESTING.md).

## Các tuyến ứng dụng hiện tại

- Công khai: `/`, `/about`.
- Không gian làm việc: `/dashboard`, `/learning`, `/analytics`, `/history`, `/profile`.
- Chuyển hướng tương thích: `/exams` → `/dashboard`.
- Tập trung: `/exam-v2/[id]`, `/exam-v2/[id]/result`, `/exam-v2-preview/[id]`, `/practice/topic/[topicSlug]`.

## Xử lý sự cố

- Thiếu gói: chạy `npm install` trong gói bị ảnh hưởng.
- Thiếu biến môi trường: kiểm tra `backend/.env` hoặc `frontend/.env.local` nhưng không in bí mật ra màn hình.
- Không kết nối được cơ sở dữ liệu: kiểm tra `/api/ready`, sau đó xem `DATABASE_URL` và PostgreSQL.
- Lo ngại về lược đồ: chạy `npx prisma migrate status` và phép so sánh chỉ đọc trước khi cân nhắc thay đổi.
- Bộ nhớ đệm Next.js: khởi động lại máy chủ phát triển; `.next`, `node_modules`, nhật ký và đầu ra kiểm thử đã được bỏ qua và không nên đưa vào commit.
