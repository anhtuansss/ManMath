# Import content từ JSON

## Scope

ManMath có hai JSON import pipeline. JSON là transport format để validate và ghi PostgreSQL, không phải runtime source. PostgreSQL + runtime validation là source of truth cho V2 content.

| Pipeline | Script | Content shape | Write behavior |
| --- | --- | --- | --- |
| Legacy V1 | `npm run import:exam` | numeric question ID, `options`, `correctAnswer` | Mặc định ghi; `--dry-run` không ghi |
| V2 | `npm run import:exam-content` | `schemaVersion: 2`, taxonomy, discriminated questions | Mặc định dry-run; chỉ `--write` mới ghi |

Không có OCR, AI parsing, web upload, admin UI, Word/PDF/Excel import trong scope hiện tại.

## Legacy V1 importer

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json
npm run import:exam -- ./src/data/import/sample-exam.json --dry-run
npm run import:exam -- ./src/data/import/manifest.json --batch
npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run
```

V1 supports exam metadata, question images, option images, explanation, topic/subtopic, `options` và `correctAnswer`. Import lại cùng exam ID sẽ update record. V1 validator yêu cầu `correctAnswer` thuộc `options`; question numeric IDs không được trùng với exam khác.

Single-file V1 import chạy trong transaction. Batch resolve paths relative to manifest, validate toàn bộ files trước khi ghi rồi import tuần tự. Nếu lỗi runtime xảy ra ở giữa batch, các file đã commit trước đó không tự động rollback.

## V2 importer

```bash
cd backend
npm run import:exam-content -- ./src/data/import/sample-exam-content-v2.json
npm run import:exam-content -- ./src/data/import/sample-exam-content-v2.json --write
```

Không truyền `--write` là dry-run: script đọc file, parse JSON, validate, in summary và không thay đổi database.

V2 envelope có dạng khái quát:

```json
{
  "schemaVersion": 2,
  "exam": {
    "id": "exam-v2-example",
    "title": "Đề mẫu",
    "description": "Mô tả",
    "durationMinutes": 90,
    "subject": "Toán",
    "difficulty": "medium",
    "source": null,
    "year": 2026,
    "statusLabel": "Draft"
  },
  "taxonomy": {
    "topics": [{ "name": "Hàm số", "slug": "ham-so" }],
    "subtopics": []
  },
  "questions": []
}
```

`questions` phải là mảng không rỗng của V2 domain questions. Mỗi question có stable string `id`, `type`, `section`, `order`, `content`, `topicSlug` và dữ liệu theo discriminant:

- `single_choice`: exactly four choices với stable choice IDs và `answerKey.correctChoiceId`.
- `true_false_group`: exactly four statements với stable statement IDs và boolean answer values.
- `short_answer`: answer key exact/numeric/numeric-with-tolerance.

Validator kiểm tra metadata, taxonomy slug, duplicate question ID/order, question type/shape và việc question subtopic thuộc topic đã khai báo. V2 import upsert Exam, Topic, Subtopic và Question trong một Prisma transaction.

## Persistence rules

V2 importer lưu `externalId`, `type`, `section`, assets/choices/statements/answerKey JSON fields. Với single choice, importer cũng materialize legacy `options` và `correctAnswer` để coexist; true/false/short-answer không có legacy correct answer.

JSON fields không được public API tin cậy trực tiếp. V2 read service reconstruct và runtime-validate persisted data trước khi tạo `PublicQuestion`.

## Limitations and debt

- V1 and V2 formats không interchangeable.
- V1 manifest batch chưa transactional across all files.
- V2 importer hiện không có manifest batch.
- Image paths hiện là static paths/assets; không có upload pipeline.
- Content versioning, immutable attempt snapshot và review-answer reveal policy chưa hoàn chỉnh.
- Legacy public API vẫn có correct-answer leakage; V2 public read không có.
