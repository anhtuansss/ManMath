| Field       | Nguồn đề xuất                       | OCR trực tiếp?     |
| ----------- | ----------------------------------- | -----------------  |
| `id`        | Backend/system generate             | ❌                 |
| `section`   | Document structure / import context | ❌                 |
| `order`     | Question number / document order    | ⚠️ Derived         |
| `content`   | OCR                                 | ✅                 |
| `topicSlug` | Taxonomy/classification             | ❌                 |
| `type`      | Adapter fixed `'single_choice'`     | ❌                 |
| `choices`   | OCR                                 | ✅                 |
| `answerKey` | Answer-key mapping phase            | ❌                 |
| `assets`    | Asset extraction/crop               | ⚠️ Separate stage  |


## Mapping Principles

1. Adapter chỉ mapping/enrich dữ liệu đã có.
2. Adapter không solve câu hỏi.
3. Adapter không tự đoán answerKey.
4. Adapter không tự đoán taxonomy.
5. Field thiếu → unresolved / validation fail, không hallucinate.
6. `type` được adapter set cố định thành `single_choice`.
7. `subtopicSlug` và `assets` có thể bỏ qua nếu chưa có.