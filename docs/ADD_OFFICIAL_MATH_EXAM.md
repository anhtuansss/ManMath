# Thêm đề thi Toán chính thức

Dùng `backend/src/data/import/thpt-math-2026-001.json` làm ví dụ cấu trúc hiện tại.

1. Chọn `exam.id` logic và ổn định; không dùng số phiên bản có thể thay đổi để thay thế định danh này.
2. Đặt `publishProfile` thành `official_full_exam`, thời lượng thành 90 phút và dùng chính sách chấm điểm mặc định của trình nhập hiện có.
3. Khai báo slug chủ đề/chủ đề con ổn định. Mỗi chủ đề con phải tham chiếu đúng chủ đề cha.
4. Thêm đúng 22 nhóm câu hỏi, với thứ tự liên tục từ 1 đến 22:
   - 12 câu `single_choice` trong phần 1;
   - 4 nhóm `true_false_group` trong phần 2;
   - 6 câu `short_answer` trong phần 3.
5. Gán ID ổn định cho từng câu hỏi, lựa chọn và mệnh đề.
6. Giữ đúng bốn lựa chọn hoặc mệnh đề ở những loại câu yêu cầu, đồng thời bảo đảm ID trong đáp án tham chiếu đúng các phần tử đó.
7. Chủ động chọn chế độ câu trả lời ngắn: chính xác, số hoặc số có sai số cho phép.
8. Đặt ảnh trong `frontend/public` và tham chiếu bằng đường dẫn ổn định `/images/...`, kèm văn bản thay thế có ý nghĩa.
9. Không đưa lời giải hoặc phần giải thích vào nội dung công khai; phần xem lại của chủ bài làm hiện chỉ hiển thị đáp án đúng an toàn, không trả đáp án nội bộ thô hoặc lời giải.
10. Chạy thử, sau đó nhập bản nháp:

```powershell
cd backend
npm run import:exam-content -- ./src/data/import/your-exam.json
npm run import:exam-content -- ./src/data/import/your-exam.json --write
```

11. Xem lại tại `/exam-v2-preview/your-exam-id` bằng JWT có email đã xác minh và nằm trong danh sách cho phép.
12. Chỉ xuất bản sau khi kiểm tra mức độ sẵn sàng thành công:

```powershell
npm run publish:exam-content -- your-exam-id
```

13. Kiểm tra nhanh luồng khám phá đề, làm bài, nộp bài khi đã đăng nhập/ẩn danh, biên nhận/xem lại, lịch sử và phân tích.

Nội dung đã xuất bản là bất biến. Muốn sửa nội dung, hãy nhập phiên bản nháp tiếp theo, kiểm tra rồi xuất bản; tuyệt đối không sửa trực tiếp bản ghi đã xuất bản.
