# Learning, mastery và dashboard

## Trạng thái hiện tại

`GET /api/me/learning-overview` là nguồn dữ liệu cho dashboard học tập `/learning` và giao diện analytics hiện tại. Endpoint cần JWT; người chưa đăng nhập không nhận dữ liệu học tập.

Learning Overview tổng hợp hai loại fact đã hoàn thành:

- `Attempt` V2 có `scoringPolicy = vietnam_thpt_math_2025`.
- `PracticeSession` của chủ sở hữu có trạng thái `completed`.

Nó không suy diễn từ browser draft, practice nhanh công khai, session `in_progress` hoặc dữ liệu attempt historical thiếu cấu trúc V2 cần thiết.

## Mastery, confidence và coverage

Mỗi aggregate overall/topic/subtopic có số câu đã trả lời, số câu hoàn toàn đúng, `earnedScoreUnits`, `maxScoreUnits`, mastery và thời điểm làm gần nhất.

- `masteryPercent = round(earnedScoreUnits / maxScoreUnits * 100)` khi có mẫu điểm; nếu không thì `null`.
- `confidence`: `insufficient` khi đã trả lời 0–2 câu, `low` khi 3–4, `usable` từ 5 câu.
- `status`: `insufficient_data` cho 0–2; `developing` cho 3–4 hoặc mastery dưới 60; `proficient` cho 60–84; `strong` từ 85 trở lên.
- `isWeak` chỉ đúng khi confidence `usable` và mastery dưới 60. Điều này tránh gắn nhãn yếu cho dữ liệu quá ít.

Coverage không phải mastery. `corpusAvailableQuestionCount` đếm câu ở `ExamVersion` published và `QuestionBankItem` published. Một subtopic là `available` khi có ít nhất 5 câu; nếu ít hơn là `insufficient`. Recommendation chỉ chọn từ pool `available`.

## Recommendation và tiến độ tiếp tục

`nextAction` chọn theo thứ tự: subtopic yếu có đủ dữ liệu, sau đó subtopic cần đánh giá thêm, cuối cùng starter subtopic có corpus khả dụng. Đây là rule-based ranking, không phải mô hình dự đoán hay lời giải AI.

`recentActivity` gộp các exam attempt và practice session đã hoàn tất, sắp theo thời điểm hoàn thành. `continueItems` chỉ liệt kê persistent practice session đang `in_progress`.

## Persistent practice API và tính nhất quán

Persistent practice cần JWT và lưu `PracticeSession`; nó không tạo `Attempt`.

```text
POST session
→ ghim các câu từ pool published
→ PUT response với expectedRevision
→ POST submit với Idempotency-Key
→ transaction chấm điểm và hoàn tất
→ facts xuất hiện trong Learning Overview
```

Mỗi user chỉ có một session `in_progress` cho mỗi topic. Lưu response dùng optimistic concurrency: request cùng revision nhưng response khác nhau nhận `409`; retry cùng response là idempotent. Submit với cùng key replay kết quả đã hoàn tất; key khác sau khi hoàn tất là xung đột.

## Giới hạn UI hiện tại

`PersistentPracticeClient` đã hiện thực việc mở, autosave, hủy và nộp session, nhưng chưa được một App Router page import. Route `/practice/topic/[topicSlug]` đang hiển thị practice nhanh công khai. Vì vậy dashboard có thể đọc/continue session đã tồn tại qua API, nhưng việc công khai user flow persistent practice cần một quyết định route/UI riêng; tài liệu này không coi đó là feature đã phát hành.

## Verification

```powershell
cd backend
npm run verify:isolated -- practice-sessions
npm run verify:isolated -- practice-config
npm run verify:isolated -- learning-overview
```

`practice-sessions` có thao tác ghi và phải chạy với database `_verify` theo [TESTING.md](TESTING.md).
