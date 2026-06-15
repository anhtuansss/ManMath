# Import đề từ JSON

## Mục đích

Import JSON dùng để thêm hoặc cập nhật đề thi vào PostgreSQL mà không cần sửa trực tiếp file seed.

MVP hiện tại phù hợp cho:

- thêm đề mới nhanh hơn
- chuẩn hóa dữ liệu trước khi đưa đề thật vào hệ thống
- test image support, topic, subtopic và option image
- test explanation tĩnh để phục vụ review và AI-ready flow

Hiện tại chưa có admin UI và chưa hỗ trợ upload file qua web.

## Workflow khuyến nghị

### Reset dữ liệu mock chuẩn

```bash
cd backend
npm run seed
```

### Setup demo đầy đủ

```bash
cd backend
npm run seed:demo
```

Lệnh này:

- seed lại các đề mock chuẩn
- import thêm `sample-json-exam-01`

## Lệnh import

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json
```

### Dry-run

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json --dry-run
```

### Batch import bằng manifest

```bash
cd backend
npm run import:exam -- ./src/data/import/manifest.json --batch
```

### Batch dry-run

```bash
cd backend
npm run import:exam -- ./src/data/import/manifest.json --batch --dry-run
```

Dry-run sẽ:

- đọc file JSON
- validate dữ liệu
- in summary
- không ghi vào database

## Script hiện tại làm gì

- upsert `Exam`
- upsert `Topic` theo `slug`
- upsert `Subtopic` theo `slug` nếu có
- upsert `Question` theo `id`
- hỗ trợ metadata exam `difficulty`, `source`, `year`
- hỗ trợ `imageUrl`
- hỗ trợ `optionImageUrls`
- hỗ trợ `explanation`
- hỗ trợ `topic`
- hỗ trợ `subtopic`
- hỗ trợ manifest để import nhiều exam file trong một lần chạy

Import lại cùng `exam.id` sẽ update, không tạo duplicate.

## Summary của dry-run

Dry-run hiện in:

- `exam id`
- `title`
- số câu hỏi
- số topic detect được
- số subtopic detect được
- số câu có `imageUrl`
- số câu có `optionImageUrls`

### Summary của batch mode

Batch mode hiện in:

- tổng số file trong manifest
- số file valid
- số file lỗi
- số exam sẽ import
- tổng số question
- danh sách lỗi theo từng file nếu có

## JSON format đầy đủ

```json
{
  "id": "sample-json-exam-01",
  "title": "De import mau tu JSON",
  "description": "De mau de test import pipeline",
  "durationMinutes": 90,
  "subject": "Toan",
  "difficulty": "medium",
  "source": "JSON Demo",
  "year": 2026,
  "statusLabel": "Imported JSON",
  "questions": [
    {
      "id": 1001,
      "question": "Cho ham so $y=x^2$. Do thi cua ham so la gi?",
      "imageUrl": "/images/questions/sample-parabola.svg",
      "explanation": "Do thi cua ham so bac hai $y=x^2$ la mot parabol.",
      "options": [
        "A. Duong thang",
        "B. Parabol",
        "C. Duong tron",
        "D. Hyperbol"
      ],
      "optionImageUrls": ["", "", "", ""],
      "correctAnswer": "B. Parabol",
      "topic": {
        "name": "Ham so",
        "slug": "ham-so"
      },
      "subtopic": {
        "name": "Do thi ham so",
        "slug": "do-thi-ham-so"
      }
    }
  ]
}
```

## Manifest format

```json
{
  "exams": [
    "./sample-exam.json",
    "./sample-exam-02.json"
  ]
}
```

Ghi chú:

- path trong manifest được tính từ thư mục chứa file manifest
- batch dry-run validate tất cả file và không ghi DB
- batch import thật hiện tại validate toàn bộ trước, sau đó import tuần tự
- nếu gặp lỗi runtime khi đang import thật, script sẽ dừng ngay tại file lỗi

## Demo sample data hiện có

Thư mục `backend/src/data/import/` hiện có:

- `sample-exam.json`: 5 câu, metadata đầy đủ, có topic/subtopic, question image, option image và explanation.
- `sample-exam-02.json`: 4 câu, dùng cho batch import và demo analytics/recommendation theo nhiều topic.
- `manifest.json`: import cả hai đề mẫu theo batch.

Hai sample hiện dùng question id trong dải `1001-1005` và `1101-1104` để giảm nguy cơ trùng với mock exam chính.

## Field bắt buộc

### Cấp độ exam

- `id`
- `title`
- `durationMinutes`
- `questions`

### Cấp độ question

- `id`
- `question`
- `options`
- `correctAnswer`

## Field optional

### Cấp độ exam

- `description`
- `subject`
- `difficulty`
- `source`
- `year`
- `statusLabel`

### Cấp độ question

- `imageUrl`
- `explanation`
- `optionImageUrls`
- `topic`
- `subtopic`

### Cấp độ topic / subtopic

- `name`
- `slug`

## Rule dữ liệu

- `correctAnswer` phải nằm trong `options`
- `options` hiện nên có đúng 4 đáp án
- `optionImageUrls` map theo index với `options`
- `optionImageUrls[index] = ""` được hiểu là đáp án đó không có ảnh
- `explanation` nếu có thì phải là string
- `difficulty` nếu có phải nằm trong `easy | medium | hard`
- `source` nếu có phải là string
- `year` nếu có phải nằm trong khoảng hợp lệ
- `question.id` không được trùng trong cùng file import
- `question.id` cũng không được trùng với question đang thuộc exam khác
- nếu có `subtopic` thì phải có `topic`
- `subtopic` được import vào đúng `topic`; không có cơ chế infer topic tự động để tránh sai taxonomy
- manifest phải có `exams` là mảng không rỗng
- mỗi phần tử trong `manifest.exams` phải là đường dẫn string hợp lệ

## Validation hiện có

Script hiện báo lỗi rõ theo field/path, ví dụ:

- `id is required`
- `durationMinutes must be a positive integer`
- `year must be between 1900 and 2100`
- `questions must be a non-empty array`
- `questions[2].id must be a positive integer`
- `questions[3].question is required`
- `questions[1].options must contain exactly 4 items`
- `questions[3].correctAnswer must be one of options`
- `questions[0].optionImageUrls must be an array of strings`
- `questions[0].explanation must be a string`
- `difficulty must be one of easy, medium, hard`
- `questions[0].topic.slug must contain only lowercase letters, numbers, and hyphens`
- `questions[0].subtopic requires topic to be provided`
- `questions contain duplicate id: 1001`
- `Manifest.exams phải là mảng không rỗng`
- `Manifest.exams[1] phải là đường dẫn string hợp lệ`

Nếu file có nhiều lỗi, script sẽ in toàn bộ danh sách lỗi.

## Giới hạn hiện tại

- chưa import Word
- chưa import PDF
- chưa import Excel
- chưa có OCR
- chưa có AI parse đề
- chưa có upload ảnh
- chưa có admin UI
- image support hiện dùng static public path
- explanation hiện là nội dung tĩnh, chưa có AI runtime
- topic/subtopic taxonomy hiện vẫn là MVP, chưa có taxonomy manager

## Troubleshooting

### Thiếu `DATABASE_URL`

- kiểm tra `backend/.env`
- đảm bảo database local đang chạy

### Prisma Client chưa sẵn sàng

```bash
cd backend
npx prisma generate
```

### `correctAnswer` không nằm trong `options`

- kiểm tra chuỗi trong `correctAnswer`
- chuỗi này phải khớp một phần tử trong `options`

### `subtopic` có nhưng `topic` thiếu

- bổ sung object `topic`
- đảm bảo `subtopic` thuộc đúng topic đó

### Dry-run pass nhưng import thật fail

- kiểm tra `question.id` có đang thuộc exam khác trong DB không
- nếu là đề mới, đổi sang dải `question.id` chưa dùng

### Sai path file JSON

Ví dụ đúng:

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json
```

### Sai path trong manifest

- kiểm tra file `manifest.json`
- đường dẫn phải relative theo thư mục chứa manifest
- ví dụ `./sample-exam-02.json` là hợp lệ nếu file nằm cùng thư mục với `manifest.json`

### Batch import có file lỗi

Hành vi hiện tại:

- `--batch --dry-run`: báo tất cả lỗi theo file, không ghi DB
- `--batch`: validate toàn bộ trước; nếu có file invalid thì dừng trước khi ghi DB
- nếu tất cả file đều valid nhưng xảy ra lỗi runtime trong lúc import thật, script sẽ fail-fast tại file lỗi
