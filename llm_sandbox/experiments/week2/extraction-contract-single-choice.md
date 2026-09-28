# 1. Extract, don't reason

Chỉ lấy thông tin có trong ảnh.
Không tự giải, suy diễn hoặc tạo thông tin mới.

# 2. Fixed structure

Output phải tuân theo schema-v0.
Không tự thêm, xóa hoặc đổi tên field.

# 3. Correct data type

Mỗi field phải đúng kiểu dữ liệu được quy định trong schema.

Nhiều item → array.
Ví dụ: choices → array.

# 4. Required / Optional / Nullable

Tuân thủ đúng trạng thái của từng field:
- Required → luôn phải có.
- Optional → có thể không xuất hiện.
- Nullable → có thể nhận giá trị null.

# 5. No guessing

Nếu không thể xác định chính xác thông tin từ ảnh:
→ không đoán.
→ sử dụng null nếu field cho phép null.

# 6. Clean representation

Text → plain text.
Formula trong text → KaTeX.

Không chuyển công thức thành lời giải hoặc mô tả bằng chữ.

# 7. Structure ≠ Content

JSON đúng schema chỉ đảm bảo output đúng cấu trúc,
không đảm bảo nội dung OCR chính xác.

# 8. Field-level confidence

Confidence được xác định theo từng field,
giúp xác định phần nào của output model không chắc chắn.