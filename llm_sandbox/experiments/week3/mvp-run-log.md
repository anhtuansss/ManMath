# ManMath OCR — MVP Run Log

## 1. Mục tiêu

Kiểm tra pipeline OCR MVP từ kết quả OCR có sẵn đến bước validation
bằng cách kết nối các thành phần:

- OCR output
- Adapter
- Existing V2 validation

Mục tiêu là kiểm tra khả năng xử lý dữ liệu của pipeline,
không phải chứng minh OCR chính xác hoàn toàn.

## 2. Pipeline

Image
→ VLM OCR
→ benchmark_results.json
→ Validate OCR output
→ Adapter
→ QuestionInput V2
→ validateQuestionInput()
→ Record result

Lưu ý:
- runOcrMvp.ts đọc kết quả OCR đã được tạo trước đó.
- Script không trực tiếp gọi model OCR trong lần chạy này.
- Validation PASS không đồng nghĩa với OCR correctness hoặc publish readiness.

## 3. Run Summary

| Metric | Result |
|---|---:|
| Total samples | 5 |
| OCR output invalid | 0 |
| Adapter errors | 0 |
| Validation failures | 0 |
| Validation passes | 5 |
| Pipeline completion | PASS |

## 4. Sample Results

| Sample ID | OCR Output | Adapter | Validation | Overall Status |
|---|---|---|---|---|
| sc_01 | Valid | PASS | PASS | PASS |
| sc_02 | Valid | PASS | PASS | PASS |
| sc_03 | Valid | PASS | PASS | PASS |
| sc_04 | Valid | PASS | PASS | PASS |
| sc_05 | Valid | PASS | PASS | PASS |

Interpretation:
- All 5 samples passed the current pipeline checks.
- No OCR output validation, adapter, or V2 validation errors were reported.
- These results only describe the checks performed by the current script.

## 5. Limitations

### 5.1 OCR correctness

The current run does not prove that the OCR output matches the source image.

Manual comparison against the original image is still required to verify:
- Vietnamese text
- Mathematical expressions
- Question content
- Choice content and ordering

### 5.2 Mock mapping context

The current script uses mock values for fields such as:
- section
- order
- topicSlug
- answerKey

Therefore, a validation pass does not establish that these values
are correct for the original exam.

### 5.3 Publish readiness

Validation PASS is not equivalent to Publish-Ready.

The current run does not establish:
- OCR content correctness
- Correct topic classification
- Correct answer key
- Correct document ordering and section
- Satisfaction of all publish requirements

## 6. Next Steps

- [ ] Run the pipeline on at least 10 images.
- [ ] Save per-sample OCR output and adapter output.
- [ ] Record validation status and error details.
- [ ] Compare OCR output against the original images.
- [ ] Identify and classify OCR errors.
- [ ] Evaluate Publish-Ready Rate using the defined publish criteria.

## 7. Current Conclusion

The MVP pipeline successfully processed 5 benchmark samples.

All 5 samples passed the current adapter and validation checks.

This confirms that the current data transformation and validation flow
works for these samples. Further testing and manual OCR verification
are required before drawing conclusions about OCR accuracy or
publish readiness.