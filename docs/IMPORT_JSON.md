# Nhập nội dung V2 từ JSON

## Phạm vi

ManMath có một đường ống nội dung đang hoạt động: JSON theo lược đồ V2 → kiểm tra lúc chạy → bản nháp PostgreSQL. PostgreSQL kết hợp kiểm tra lúc chạy là nguồn sự thật của hệ thống.

Các file chính tắc:

- Ví dụ dùng cho môi trường thật: `backend/src/data/import/2026-06-11-bo-gddt-viet-nam-tot-nghiep-001.json`
- Dữ liệu kiểm thử xác minh: `backend/src/test-fixtures/v2-minimal-exam.json`

Không còn trình nhập V1, trình nhập hàng loạt bằng manifest, OCR, bộ phân tích AI, chức năng tải lên web hoặc trình nhập Word/PDF/Excel đang hoạt động.

Taxonomy canonical được mô tả trong [TAXONOMY.md](TAXONOMY.md). Trường `taxonomy` của mỗi JSON chỉ cần khai báo các topic/subtopic mà đề thực sự dùng, nhưng slug, tên và quan hệ cha-con phải khớp tuyệt đối với catalog canonical. Importer không tự tạo taxonomy từ file JSON.

## Lệnh

Chạy từ `backend`:

```powershell
npm run import:exam-content -- ./src/data/import/2026-06-11-bo-gddt-viet-nam-tot-nghiep-001.json
npm run import:exam-content -- ./src/data/import/2026-06-11-bo-gddt-viet-nam-tot-nghiep-001.json --write
npm run publish:exam-content -- 2026-06-11-bo-gddt-viet-nam-tot-nghiep-001
```

Không có `--write`, thao tác nhập chỉ chạy thử: đọc, kiểm tra và in tóm tắt mà không ghi cơ sở dữ liệu. Có `--write`, thao tác nhập cập nhật bản nháp mới nhất hoặc tạo phiên bản nháp tiếp theo trong một giao dịch cơ sở dữ liệu. Nó không bao giờ sửa nội dung đã xuất bản.

## Cấu trúc bao ngoài

```json
{
  "schemaVersion": 2,
  "publishProfile": "official_full_exam",
  "exam": {
    "id": "2026-06-11-bo-gddt-viet-nam-tot-nghiep-001",
    "title": "Đề chính thức kỳ thi tốt nghiệp THPT năm 2026 môn Toán",
    "description": "Đề luyện tập theo cấu trúc THPT môn Toán.",
    "durationMinutes": 90,
    "subject": "Toán",
    "difficulty": "medium",
    "source": null,
    "year": 2026,
    "statusLabel": "Draft"
  },
  "taxonomy": {
    "topics": [],
    "subtopics": []
  },
  "questions": []
}
```

`Exam.id` là ID logic ổn định. Nhập nội dung sau này với cùng ID sẽ tạo hoặc cập nhật một `ExamVersion` nháp; `versionNumber` do tầng lưu trữ quản lý, không được dùng làm ID logic khi biên soạn.

## Loại câu hỏi

- `single_choice`: đúng bốn lựa chọn có ID ổn định và `answerKey.correctChoiceId`.
- `true_false_group`: đúng bốn mệnh đề có ID ổn định và một giá trị boolean cho mỗi mệnh đề trong đáp án.
- `short_answer`: đáp án ở chế độ `exact`, `numeric` hoặc `numeric_with_tolerance`.

Mỗi câu hỏi cần `id` dạng chuỗi ổn định, `section` hợp lệ, `order` liên tục/duy nhất, nội dung, `topicSlug`, `subtopicSlug` hợp lệ nếu có và dữ liệu đúng với từng loại. Khi tạo phiên bản sau của cùng một câu hỏi về mặt ngữ nghĩa, nên giữ nguyên ID.

Tài nguyên dùng đường dẫn công khai:

```json
{
  "assets": [
    {
      "src": "/images/2026_001_img/sc-07-hinh-lap-phuong.png",
      "alt": "Hình lập phương minh họa cho câu hỏi"
    }
  ]
}
```

Đặt file trong `frontend/public`; văn bản thay thế phải có ý nghĩa. KaTeX được viết trong nội dung văn bản theo quy ước mà `MathText` hỗ trợ.

## Kiểm tra hợp lệ và mức độ sẵn sàng

Quá trình nhập kiểm tra siêu dữ liệu, quan hệ sở hữu trong hệ thống phân loại, ID ổn định, thứ tự trùng lặp, cấu trúc phân biệt theo loại, tham chiếu đáp án và quy tắc chuẩn hóa câu trả lời ngắn.

Hồ sơ `practice` chấp nhận mọi tập câu hỏi V2 hợp lệ. `official_full_exam` còn yêu cầu:

- thời lượng 90 phút;
- chính sách `vietnam_thpt_math_2025`;
- đúng 22 nhóm câu hỏi có thứ tự từ 1 đến 22;
- 12 câu trắc nghiệm một lựa chọn ở phần 1;
- 4 nhóm đúng/sai ở phần 2;
- 6 câu trả lời ngắn ở phần 3;
- tối đa 1000 `ScoreUnits`.

Khi xuất bản, hệ thống chạy lại kiểm tra mức độ sẵn sàng. Nếu thành công, phiên bản đang xuất bản được chuyển sang lưu trữ và bản nháp trở thành nội dung đã xuất bản, bất biến.

## Ghi chú học tập

- File JSON đã nhập không tự nhiên đáng tin chỉ vì có thể đọc được.
- ID bên ngoài ổn định bảo vệ trạng thái API/trình duyệt; quan hệ cơ sở dữ liệu dùng ID bản ghi chính tắc.
- Chạy thử phát hiện lỗi miền, còn kiểm tra mức độ sẵn sàng trả lời câu hỏi riêng: “Bản nháp này có đủ điều kiện xuất bản theo hồ sơ không?”
- Muốn sửa nội dung đã xuất bản phải tạo bản nháp/phiên bản mới, không bao giờ sửa trực tiếp.
