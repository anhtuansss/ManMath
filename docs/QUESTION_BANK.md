# Question Bank

## Trạng thái hiện tại

Question Bank là nguồn câu hỏi độc lập với một đề thi hoàn chỉnh. Nó phục vụ persistent practice, bên cạnh các `ExamVersionQuestion` thuộc `ExamVersion` đã `published`. Đây không phải API CRUD hay màn quản trị: nội dung đi vào hệ thống bằng JSON qua dòng lệnh.

Các file JSON Question Bank hiện có nằm trong `backend/src/data/question-bank/`; `qb-phep-chieu-001.json` là một ví dụ hợp lệ của contract này.

Mỗi batch có `externalId` ổn định; mỗi item có `logicalKey`, `revision` và trạng thái `draft`, `published` hoặc `archived`. Item đã publish là bất biến. Khi một `logicalKey` được publish ở revision mới, revision publish trước đó chuyển sang `archived`; session đã ghim revision cũ vẫn đọc được.

## Contract import

Chạy từ `backend`:

```powershell
npm run import:question-bank -- <json-path>
npm run import:question-bank -- <json-path> --write
npm run publish:question-bank -- <batch-id>
```

Không có `--write`, importer chỉ validate và in tóm tắt. Có `--write`, importer tạo/cập nhật draft trong cùng batch. Batch đã có item không còn `draft` không thể import lại.

Envelope hiện dùng `schemaVersion: 1`:

```json
{
  "schemaVersion": 1,
  "id": "qb-2026-ham-so-001",
  "title": "Câu hỏi Hàm số",
  "source": {
    "name": "Nguồn biên soạn",
    "type": "curated",
    "year": 2026,
    "documentRef": "internal:qb-2026-ham-so-001"
  },
  "taxonomy": {
    "topicSlug": "ham-so-va-do-thi-nen-tang",
    "subtopicSlug": "ham-so-va-tap-xac-dinh"
  },
  "questions": [
    {
      "id": "qb-ham-so-001",
      "type": "single_choice",
      "section": 1,
      "order": 1,
      "content": "Giá trị của f(0) là bao nhiêu?",
      "topicSlug": "ham-so-va-do-thi-nen-tang",
      "subtopicSlug": "ham-so-va-tap-xac-dinh",
      "choices": [
        { "id": "a", "content": "0" },
        { "id": "b", "content": "1" },
        { "id": "c", "content": "2" },
        { "id": "d", "content": "3" }
      ],
      "answerKey": { "correctChoiceId": "a" },
      "sourceQuestionRef": "Câu 1",
      "assetSource": null
    }
  ]
}
```

Mỗi phần tử của `questions` là một `QuestionInput` V2, cộng thêm `sourceQuestionRef` và `assetSource` tùy chọn. Các quy tắc type-specific, asset và answer key giống tài liệu [Import JSON](IMPORT_JSON.md). `source.type` chỉ nhận `official`, `mock` hoặc `curated`; `source.year` nullable hoặc là số nguyên 1900–2100. Taxonomy của từng câu phải khớp hoàn toàn taxonomy duy nhất của batch, và phải có trong catalog canonical đã được đồng bộ.

## Publish và chọn câu cho practice

Publish kiểm tra lại từng item rồi publish toàn bộ draft item của batch trong một transaction. Không có cơ chế publish từng câu.

Khi mở persistent practice, service lấy hai pool published cùng taxonomy/type:

1. `ExamVersionQuestion` thuộc `ExamVersion` đã publish.
2. `QuestionBankItem` đã publish.

Các bản trùng provenance hoặc fingerprint nội dung được loại trùng; câu từ đề thi đầy đủ được ưu tiên. Câu được chọn được ghim vào `PracticeSessionQuestion` bằng đúng một FK nguồn. Vì vậy archive nội dung mới hơn không làm thay đổi session đang làm hay đã nộp.

## Kiểm tra vận hành

```powershell
cd backend
npm run audit:practice-corpus
npm run verify:practice-assets
```

`audit:practice-corpus` báo coverage theo taxonomy, type và cả nguồn đề/Question Bank. `verify:practice-assets` kiểm tra asset của tất cả câu published ở cả hai nguồn, bao gồm đường dẫn trong `frontend/public` và `alt` text.

Xác minh cô lập bao phủ revision, immutability, pinning và deduplication:

```powershell
npm run verify:isolated -- question-bank
```

## Không nằm trong scope hiện tại

Chưa có route/màn hình admin để tạo, sửa hoặc upload Question Bank. Không tự đưa Word/PDF/Excel/OCR/AI vào pipeline; hãy tạo JSON hợp lệ và chạy dry-run trước.
