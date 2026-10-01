# QuestionInput V2 — single_choice

## Source
- File: `backend/src/types/examContent.ts`
- Type/Schema: `SingleChoiceQuestionInput` (kết hợp với `SharedQuestionFields`)

## Required fields

| Field | Type | Required | Nullable | Notes |
|---|---|---|---|---|
| `id` | `QuestionId` (string) | Yes | No | Định danh duy nhất của câu hỏi |
| `section` | `number` (`1 \| 2 \| 3`) | Yes | No | Số thứ tự phần thi |
| `order` | `number` | Yes | No | Thứ tự câu hỏi |
| `content` | `string` | Yes | No | Nội dung văn bản câu hỏi |
| `topicSlug` | `string` | Yes | No | Mã định danh chủ đề chính (`topic slug`) |
| `type` | `string` (`'single_choice'`) | Yes | No | Bắt buộc phải là `'single_choice'` |
| `choices` | `ChoiceInput[]` (Tuple 4 phần tử) | Yes | No | Bắt buộc đúng 4 phương án lựa chọn (mỗi phần tử có `id` và `content`) |
| `answerKey` | Object | Yes | No | Đối tượng chứa đáp án, bắt buộc có `correctChoiceId` |

## Optional fields

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `subtopicSlug` | `string` | No (Optional `?`) | Mã định danh chủ đề con (`subtopic slug`) |
| `assets` | `QuestionAssetInput[]` | No (Optional `?`) | Mảng chứa danh sách ảnh/tài nguyên đính kèm (`{ src, alt }`) |

## singgle_choice mapping

| Field | Nguồn đề xuất | OCR trực tiếp? |
|---|---|---|
| id | Backend/system generate | ❌ |
| section | Document structure / import context | ❌ |
| order | Question number / document order | ⚠️ Derived |
| content | OCR | ✅ |
| topicSlug | Taxonomy/classification | ❌ |
| type | Adapter fixed 'single_choice' | ❌ |
| choices | OCR | ✅ |
| answerKey | Answer-key mapping phase | ❌ |
| assets | Asset extraction/crop | ⚠️ Separate stage |

## single_choice constraints

- **`type`**: Giá trị cố định bắt buộc là `'single_choice'`.
- **`choices`**: Bắt buộc là một tuple có **đúng 4 phần tử** (`ChoiceInput`), mỗi phần tử cấu trúc gồm `id` (string) và `content` (string), kèm tùy chọn `assets` riêng cho từng choice nếu cần.
- **`answerKey`**: Bắt buộc cung cấp đối tượng dạng `{ correctChoiceId: ChoiceId }`.
- **`status`**: **Không tồn tại** trường này ở cấp độ câu hỏi (trạng thái đề thi chỉ xuất hiện ở mức metadata toàn cục).

## Fields OCR can provide

- `content`: Văn bản câu hỏi nhận diện từ ảnh/PDF đề thi.
- `choices`: Nội dung text của 4 phương án (A, B, C, D).

## Fields OCR cannot/should not provide

- `id`: Thường do hệ thống tự sinh hoặc định dạng theo quy chuẩn quản lý đề thi, không nên để OCR tự đoán.
- `topicSlug` / `subtopicSlug`: Phân loại chủ đề học thuật, đòi hỏi hệ thống gắn nhãn (tagging) hoặc xử lý chuyên sâu khác, không thể trích xuất trực tiếp bằng OCR văn bản thuần túy.
- `answerKey`: Đề thi thô thông thường qua OCR không chứa đáp án (đáp án thường nằm ở bảng key riêng biệt hoặc cần xử lý logic khác).
- `status`: Không được định nghĩa trong schema của câu hỏi.