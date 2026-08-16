# Chấm điểm V2

## Chính sách hiện tại

Phía máy chủ là nơi duy nhất có thẩm quyền chấm điểm. Câu trả lời thô được kiểm tra và chuẩn hóa trước khi áp dụng chính sách `vietnam_thpt_math_2025`.

```text
RawSubmittedResponse
→ kiểm tra loại và quan hệ sở hữu
→ SubmittedResponse đã chuẩn hóa
→ gradeQuestion
→ GradingResult
→ lưu dữ kiện ScoreUnits khi tạo Attempt
```

## ScoreUnits

Đơn vị điểm nguyên giúp tránh phép tính số thực trong quy tắc chấm điểm.

| Loại câu hỏi | Điều kiện | Đơn vị được nhận |
| --- | --- | --- |
| `single_choice` | Đúng ID lựa chọn ổn định | 25 |
| `true_false_group` | Có 0/1/2/3/4 mệnh đề đúng | 0 / 10 / 25 / 50 / 100 |
| `short_answer` | Đúng theo chế độ đáp án | 50 |

1000 đơn vị tương ứng 10 điểm hiển thị.

`Attempt.scoreUnits` cùng số đơn vị được nhận/tối đa của từng câu là dữ kiện chấm điểm. `Attempt.score` được suy ra bằng `scoreUnits / 100` để hiển thị và tổng hợp; không dùng nó để dựng lại tính đúng/sai chi tiết.

## Chế độ câu trả lời ngắn

- `exact`: so sánh văn bản đã chuẩn hóa với đáp án chính tắc.
- `numeric`: chuẩn hóa biểu diễn thập phân trước khi so sánh giá trị số.
- `numeric_with_tolerance`: chấp nhận khi khoảng cách số không lớn hơn sai số đã cấu hình.

Câu trả lời đã chuẩn hóa có thể được lưu; đáp án thô không bao giờ được lưu như dữ liệu câu trả lời của học sinh.

## Điểm tối đa của bài làm

`maximumExamScore = 1000` là mức tối đa của chính sách chính thức. Mỗi bài làm còn lưu `maxScoreUnits`, được tính từ đúng phiên bản đề đã nộp. Vì vậy, dữ liệu luyện tập dùng để kiểm thử có thể có mức tối đa thấp hơn 1000.

## Ranh giới chấm điểm dùng chung

Chấm đề, tạo bài làm được lưu và chấm luyện tập đều dùng chung bộ kiểm tra/chuẩn hóa/chấm điểm V2. Luyện tập chỉ khác ở việc không tạo bản ghi `Attempt` hoặc `AttemptAnswer`.

Kết quả chấm công khai có tính đúng/sai và điểm được nhận nhưng không có đáp án. Sau đó, phần xem lại của chủ bài làm có thể trả DTO đáp án đúng theo từng loại câu, được phân quyền và lấy từ ảnh chụp dữ liệu bất biến.

## Bối cảnh lịch sử

Luồng ban đầu chấm chỉ số lựa chọn ở phía giao diện và lưu chỉ số đã chọn/đúng. Các trường đó cùng mô hình `Question` cũ đã bị xóa. Mô hình `ScoreUnits` dạng số nguyên được giữ vì hỗ trợ chấm điểm một phần cho câu đúng/sai một cách xác định và cung cấp cho phân tích cùng dữ kiện mà biên nhận/xem lại sử dụng.
