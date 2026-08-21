# Vòng đời nội dung

Lược đồ truyền tải chính tắc được mô tả trong [IMPORT_JSON.md](IMPORT_JSON.md). Tài liệu này mô tả vòng đời vận hành. Taxonomy dùng chung có nguồn chính tắc riêng tại [TAXONOMY.md](TAXONOMY.md); JSON không có quyền tự thay đổi catalog này.

## Quy trình hiện tại

```text
soạn JSON V2
→ kiểm tra chạy thử
→ nhập bản nháp
→ xem trước nội bộ không chứa đáp án
→ kiểm tra mức độ sẵn sàng
→ xuất bản ExamVersion bất biến
→ khám phá đề/làm bài/luyện tập công khai
```

Các lệnh chạy từ `backend`:

```powershell
npm run import:exam-content -- ./src/data/import/2026-06-11-bo-gddt-viet-nam-tot-nghiep-001.json
npm run import:exam-content -- ./src/data/import/2026-06-11-bo-gddt-viet-nam-tot-nghiep-001.json --write
npm run publish:exam-content -- 2026-06-11-bo-gddt-viet-nam-tot-nghiep-001
```

Tuyến xem trước: `/exam-v2-preview/2026-06-11-bo-gddt-viet-nam-tot-nghiep-001`. Tuyến này yêu cầu JWT đã xác minh có email nằm trong `DRAFT_PREVIEW_AUTHORIZED_EMAILS`. Chế độ xem trước vô hiệu hóa nộp bài, lưu bài làm và hành vi lưu trữ của luồng làm đề công khai.

## Quy tắc chỉnh sửa

- `Exam.id` luôn là định danh logic xuyên suốt các phiên bản.
- Trình nhập chỉ được thay thế nội dung bản nháp.
- Việc xuất bản chạy kiểm tra mức độ sẵn sàng ngay trong giao dịch xuất bản.
- Phiên bản đã xuất bản và đã lưu trữ được bảo vệ bằng trình kích hoạt cơ sở dữ liệu.
- Muốn sửa nội dung, hãy tạo/nhập bản nháp tiếp theo, xem trước rồi xuất bản.
- Không sửa trực tiếp bản ghi phiên bản hoặc câu hỏi đã xuất bản.

## Hồ sơ xuất bản

- `practice`: nội dung V2 hợp lệ, không bắt buộc cấu trúc chính thức 12/4/6.
- `official_full_exam`: đúng cấu trúc đề THPT 90 phút và tối đa 1000 đơn vị điểm.

## Bối cảnh lịch sử

Quy trình trước đây ghi các bản ghi `Question` bằng ID số có thể thay đổi và dùng công cụ phân loại bộ máy trong giai đoạn hai hệ thống cùng tồn tại. Các công cụ và bảng đó đã ngừng hoạt động. Bài học còn được giữ lại là phải kiểm tra dữ liệu mơ hồ và điền đầy đủ định danh trước khi dọn lược đồ theo cách phá hủy; thao tác nội dung hiện chỉ dùng `ExamVersion` và `ExamVersionQuestion`.
