Day 5 — Chấm benchmark
ID	Content	Choices	Structure
sc_01	✅ PASS	✅ PASS	✅ PASS
sc_02	✅ PASS	✅ PASS	✅ PASS
sc_03	✅ PASS	✅ PASS	✅ PASS
sc_04	✅ PASS	✅ PASS	✅ PASS
sc_05	✅ PASS	✅ PASS	✅ PASS

| ID | Category | Sample | Problem | Cause | Action | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| ERR-01 | CONFIDENCE | sc_01–05 | Model luôn trả confidence = 1.0 dù output vẫn có khác biệt | Confidence do model tự đánh giá, chưa calibration | Không dùng confidence để tính accuracy; benchmark confidence riêng sau | |

Day 6 — Error Analysis

Total samples: 5

Structure errors: 0
Content errors: 1
Choice errors: 0

Actual OCR errors:
- sc_03: "chuyểnđộng" → "chuyển động"
  Type: TEXT
  Cause: missing whitespace

Ground Truth issues:
- Một số sample cần manual verification vì GT được nhập thủ công.
- Không dùng sample có GT chưa được verify để kết luận model accuracy.

Observation:
- 5/5 samples đạt structure.
- 5/5 samples đạt choices.
- 4/5 content match sau normalization.
- 1 text OCR error được phát hiện.