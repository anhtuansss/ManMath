# ManMath OCR — Week 1 Report

## 1. Mục tiêu Week 1

* Hiểu cơ bản về OCR và VLM.
* Xây dựng pipeline OCR với Gemini.
* Trích xuất nội dung từ ảnh, đặc biệt là công thức toán.
* Chuẩn hóa kết quả OCR thành JSON.
* Xây dựng benchmark cho OCR.
* Đo latency và xác định bottleneck.
* Bắt đầu Error Log để theo dõi các vấn đề trong quá trình phát triển.

---

## 2. Pipeline hiện tại

```text
Image
  ↓
PIL
  ↓
Gemini VLM
  ↓
Extract content
  ↓
Prediction
  ↓
Benchmark
  ├── Accuracy
  └── Latency
```

Output hiện tại:

```json
{
  "id": "formula_01",
  "category": "FORMULA",
  "prediction": "$$\\frac{x-3}{4} = \\frac{y+2}{-5} = \\frac{z-1}{2}$$",
  "latency_ms": 19592.78
}
```

---

## 3. Những gì đã học / triển khai

### OCR & VLM

* OCR dùng để chuyển nội dung trong ảnh thành dữ liệu có thể xử lý bằng máy.
* VLM có thể nhận cả hình ảnh và prompt để thực hiện OCR.
* Với ManMath, VLM phù hợp vì input không chỉ có text mà còn có:

  * Công thức toán.
  * Ký hiệu toán học.
  * Hình học.
  * Bảng.
  * Nội dung đề thi.

### Structured Output

Kết quả OCR được chuẩn hóa thành JSON để dễ:

* Lưu benchmark.
* So sánh prediction với ground truth.
* Phân loại sample.
* Theo dõi lỗi.
* Xử lý ở các bước tiếp theo của pipeline.

---

## 4. Benchmark Latency

Ban đầu sử dụng:

```python
client.models.generate_content(...)
```

Latency quan sát được:

```text
~153.7s
```

Sau đó thử:

```python
client.chats.create(...)
chat.send_message(...)
```

Latency giảm đáng kể.

Các lần benchmark tiếp theo với `formula_01`:

| Run | API latency |
| --- | ----------: |
| 1   |      19.55s |
| 2   |      27.55s |
| 3   |      37.33s |
| 4   |      28.60s |
| 5   |      36.01s |

Khoảng latency quan sát được:

```text
Min ≈ 19.6s
Max ≈ 37.4s
Mean ≈ 29.8s
```

Latency dao động khá lớn giữa các request.

### Timing breakdown

Benchmark cho thấy:

```text
Image loading   → vài ms
Chat creation   → vài ms
API/model       → hàng chục giây
Parsing         → gần 0 ms
```

Ví dụ:

```text
Load:   16.04 ms
Chat:   15.84 ms
API:    27547.33 ms
Parse:  0.02 ms
Total:  27579.23 ms
```

### Kết luận

Bottleneck hiện tại nằm ở:

```text
Gemini API / Model inference
```

không nằm ở:

```text
Image loading
Chat creation
JSON parsing
```

Vì vậy chưa cần tối ưu thêm phần local pipeline ở thời điểm này.

---

## 5. Accuracy Benchmark

Dataset benchmark hiện tại gồm:

```text
FORMULA
- formula_01
- formula_02
- formula_03
- formula_04

TEXT
- text_01
- text_02
- text_03

CHOICE
- choice_01
- choice_02
- choice_03
```

Tổng cộng:

```text
10 samples
```

### Kết quả chạy hiện tại

| Sample     | Kết quả   | Latency |
| ---------- | --------- | ------: |
| formula_01 | ✅ Correct |  19.59s |
| formula_02 | ❌ API 503 |       — |
| formula_03 | ✅ Correct |  23.20s |
| formula_04 | ❌ API 503 |       — |
| text_01    | ❌ API 503 |       — |
| text_02    | ✅ Correct |  17.43s |
| text_03    | ❌ API 429 |       — |
| choice_01  | ❌ API 429 |       — |
| choice_02  | ❌ API 429 |       — |
| choice_03  | ❌ API 429 |       — |

### Accuracy hiện tại

Trong 3 sample được xử lý thành công:

```text
Correct: 3
Incorrect: 0

Accuracy = 3 / 3 = 100%
```

> Lưu ý: đây chỉ là accuracy trên **3 sample đã xử lý thành công**, chưa phải accuracy của toàn bộ dataset 10 sample.

---

## 6. API Errors

### 503 — UNAVAILABLE

Một số request nhận:

```text
503 UNAVAILABLE
```

Nguyên nhân được API trả về:

```text
This model is currently experiencing high demand.
```

Các sample gặp lỗi:

```text
formula_02
formula_04
text_01
```

Đây là lỗi availability của model, không phải OCR error.

---

### 429 — RESOURCE_EXHAUSTED

Sau đó API trả:

```text
429 RESOURCE_EXHAUSTED
```

Quota hiện tại:

```text
20 requests
```

Các sample bị ảnh hưởng:

```text
text_03
choice_01
choice_02
choice_03
```

Các lỗi 429 cũng không được tính là OCR sai.

---

# 7. Error Log

| ID     | Topic            | Sample                          | Problem                           | Cause                      | Action                                  | Status     |
| ------ | ---------------- | ------------------------------- | --------------------------------- | -------------------------- | --------------------------------------- | ---------- |
| ERR-01 | API Latency      | formula_01                      | `generate_content()` mất ~153.7s  | Request latency cao        | Thử `chats.create()` + `send_message()` | Improved   |
| ERR-02 | API Latency      | formula_01                      | Latency dao động ~19.6–37.4s      | Bottleneck nằm ở API/model | Tách timing từng bước                   | Monitoring |
| ERR-03 | API Availability | formula_02, formula_04, text_01 | API trả 503                       | Model high demand          | Retry khi service ổn định               | Pending    |
| ERR-04 | API Quota        | text_03, choice_01–03           | API trả 429                       | Đạt giới hạn free-tier     | Chờ quota reset / sử dụng quota phù hợp | Blocked    |
| ERR-05 | Benchmark        | Dataset 10 samples              | Chưa benchmark đủ toàn bộ dataset | 503 + 429                  | Chạy lại khi API khả dụng               | Pending    |

---

# 8. Những gì đã hoàn thành

* [x] Hiểu OCR cơ bản.
* [x] Hiểu vai trò của VLM trong OCR.
* [x] Xây dựng OCR pipeline với Gemini.
* [x] Xử lý ảnh bằng PIL.
* [x] Extract formula.
* [x] Extract text.
* [x] Chuẩn hóa output thành JSON.
* [x] Xây dựng benchmark dataset.
* [x] Đo latency.
* [x] Tách latency thành load / chat / API / parse.
* [x] Xác định API/model là bottleneck.
* [x] Kiểm tra accuracy thủ công trên sample thành công.
* [x] Bắt đầu Error Log.

---

# 9. Chưa hoàn thành

* [ ] Thu thập các OCR error thực tế.
* [ ] Phân tích nguyên nhân từng OCR error.
* [ ] Hoàn thiện benchmark report.

---

# 10. Kết luận Week 1

Week 1 đã hoàn thành phần nền tảng của ManMath OCR:

```text
OCR / VLM
    ↓
Gemini OCR Pipeline
    ↓
Structured JSON
    ↓
Benchmark
    ↓
Latency + Accuracy
    ↓
Error Log
```

Kết quả ban đầu cho thấy model có thể OCR đúng các sample đã kiểm tra. Trong 3 sample xử lý thành công, cả 3 đều được xác nhận đúng.

Vấn đề chính hiện tại là latency API và giới hạn quota. Đây là vấn đề cần tiếp tục theo dõi khi benchmark với dataset lớn hơn.

Benchmark accuracy toàn bộ 10 sample chưa thể hoàn thành do API trả về 503 và 429, vì vậy **không kết luận accuracy tổng thể từ kết quả hiện tại**.

---

## Week 1 Status

**Foundation:** ✅ Complete

**Pipeline:** ✅ Complete

**Benchmark setup:** ✅ Complete

**Initial accuracy check:** ✅ Complete

**Full benchmark:** 🟡 Pending API quota

**Error analysis:** 🟡 Pending real OCR errors
