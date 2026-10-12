# Hallucination Demo

## Goal

Kiểm tra ảnh hưởng của system instruction đến khả năng xử lý câu hỏi thiếu dữ kiện.

## Dataset

5 câu Toán:

- Q1: Thiếu dữ kiện — tam giác cân chỉ biết đáy.
- Q2: Thiếu dữ kiện — hình chữ nhật chỉ biết đường chéo.
- Q3: Có đáp án — bài toán bèo.
- Q4: Có đáp án — trung bình cộng.
- Q5: Có đáp án — giảm giá.

## Condition A

Không có system instruction đặc biệt.

Kết quả:
- Q1: Đúng
- Q2: Đúng
- Q3: Đúng
- Q4: Đúng
- Q5: Đúng

Output dài, model giải thích chi tiết.

Metrics:
- Input tokens: 206
- Output tokens: 976
- Latency: 21.37s

## Condition B

System instruction:

"You are a careful mathematical assistant.
Answer only when the information provided is sufficient to determine the answer.
If the problem does not contain enough information, explicitly say:
'Không đủ dữ kiện.'
Do not guess or invent missing information."

Kết quả:
- Q1: Đúng
- Q2: Đúng
- Q3: Đúng
- Q4: Đúng
- Q5: Đúng

Output ngắn gọn, chỉ trả lời kết quả.

Metrics:
- Input tokens: 253
- Output tokens: 53
- Latency: 16.20s

## Conclusion

- Cả hai condition đều không hallucinate trên dataset 5 câu.
- System instruction làm thay đổi rõ rệt behavior của model.
- Condition B khiến model trả lời ngắn gọn và explicit hơn khi dữ kiện không đủ.
- Experiment chưa đủ để kết luận system instruction luôn làm giảm hallucination.
- Dataset nhỏ nên chỉ dùng để minh họa behavior, không phải benchmark tổng quát.