# Scoring V2

## Policy

V2 dùng policy `vietnam_thpt_math_2025`. Backend là nguồn chấm điểm duy nhất; frontend chỉ gửi raw response và hiển thị result nhận được.

## Score units

`ScoreUnits` là số nguyên để tránh biểu diễn điểm bằng float trong logic grading.

| Dạng câu | Điều kiện | Awarded units |
| --- | --- | --- |
| `single_choice` | Đúng choice ID | 25 |
| `true_false_group` | Đúng 0/1/2/3/4 mệnh đề | 0 / 10 / 25 / 50 / 100 |
| `short_answer` | Đúng theo mode của answer key | 50 |

1000 units tương đương 10 điểm.

## Short answer modes

- `exact`: so sánh normalized response với canonical answer.
- `numeric`: so sánh giá trị thập phân đã chuẩn hóa.
- `numeric_with_tolerance`: chấp nhận sai số không vượt tolerance.

## Maximum score

Policy có `maximumExamScore = 1000` units, tức thang 10 điểm cho một cấu trúc đề đầy đủ theo policy.

Mỗi attempt V2 cũng lưu `maxScoreUnits`, là tổng điểm tối đa của các câu thực tế trong exam được nộp. Vì vậy exam mẫu hoặc exam chưa đủ cấu trúc có thể có `maxScoreUnits` thấp hơn 1000. UI receipt nên dùng `scoreUnits / maxScoreUnits` khi cần biểu diễn điểm của attempt cụ thể.

## Grading boundary

```text
Raw submitted response
→ runtime validation
→ normalized SubmittedResponse
→ gradeQuestion
→ GradingResult
```

`GradingResult` gồm question external ID, optional normalized response, `isCorrect` và `awardedScore`. Nó không chứa answer key.

## Publish profiles

`official_full_exam` is exactly 12 `single_choice`, 4 `true_false_group`, and 6 `short_answer` containers, ordered 1..22, duration 90 minutes, policy `vietnam_thpt_math_2025`, and maximum 1000 units. `practice` need not have the 12/4/6 format, but must pass every runtime/domain/taxonomy validation and must never be advertised as an official full exam.

## Compatibility note

Legacy score được persist từ V2 units bằng `scoreUnits / 100` để các surfaces cũ có thể tiếp tục đọc trường `Attempt.score`. Đây là compatibility representation, không thay thế `scoreUnits`, `maxScoreUnits` hoặc `scoringPolicy` của V2.
