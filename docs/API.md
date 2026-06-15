# API ManMath

## Ghi chú chung

- Base URL backend local: `http://localhost:5000`
- Các route exam được mount dưới `/api`
- Route protected dùng JWT Bearer token

## Exam APIs

| Method | Endpoint | Auth | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Kiểm tra backend còn hoạt động |
| `GET` | `/api/exams` | Public | Lấy danh sách đề, hỗ trợ tìm kiếm và lọc theo topic/subtopic/thời lượng/độ khó/năm/nguồn |
| `GET` | `/api/exams/:id` | Public | Lấy chi tiết một đề |
| `GET` | `/api/topics` | Public | Lấy danh sách topic và subtopic để filter exam list |
| `GET` | `/api/practice/topic/:topicSlug` | Public | Tạo bộ luyện tập động theo topic, không lưu attempt vào DB |
| `POST` | `/api/exam/submit` | Optional JWT | Nộp bài, chấm điểm, lưu attempt và trả kết quả |

### Exam list query params

`GET /api/exams` hỗ trợ các query param additive sau:

- `search`: tìm theo `title` và `description`
- `topic`: lọc theo `Topic.slug`
- `subtopic`: lọc theo `Subtopic.slug`
- `durationMin`: lọc đề có `durationMinutes >= durationMin`
- `durationMax`: lọc đề có `durationMinutes <= durationMax`
- `difficulty`: lọc theo `easy | medium | hard`
- `year`: lọc theo năm thi chính xác
- `source`: lọc theo nguồn đề, tìm kiếm không phân biệt hoa thường

Ví dụ:

```txt
/api/exams?search=ham
/api/exams?topic=ham-so
/api/exams?topic=ham-so&subtopic=cuc-tri
/api/exams?durationMin=60&durationMax=90
/api/exams?difficulty=easy
/api/exams?year=2026
/api/exams?source=ManMath
/api/exams?search=ham&topic=ham-so&difficulty=easy&year=2026
```

Nếu không truyền query param, response giữ shape cũ.

Nếu `durationMin`, `durationMax`, `difficulty` hoặc `year` không hợp lệ, API trả `400`.

### Exam detail response shape

```ts
{
  id: string;
  examTitle: string;
  durationMinutes: number;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  source: string | null;
  year: number | null;
  statusLabel: string;
  questions: Array<{
    id: number;
    question: string;
    imageUrl: string | null;
    explanation: string | null;
    options: string[];
    optionImageUrls: Array<string | null>;
    subtopic: {
      id: string;
      name: string;
      slug: string;
    } | null;
    correctAnswer: string;
  }>;
}
```

### Exam list response shape

```ts
Array<{
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  source: string | null;
  year?: number;
  statusLabel: string;
}>
```

### Topics response shape

```ts
{
  topics: Array<{
    id: string;
    name: string;
    slug: string;
    subtopics: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  }>;
}
```

### Submit response shape

```ts
{
  correctCount: number;
  totalQuestions: number;
  score: number;
  topicStats: TopicStatDto[];
}
```

### Topic practice response shape

```ts
{
  practiceId: string;
  topic: {
    name: string;
    slug: string;
  };
  title: string;
  durationMinutes: number;
  questions: Array<{
    id: number;
    question: string;
    imageUrl: string | null;
    explanation: string | null;
    options: string[];
    optionImageUrls: Array<string | null>;
    subtopic: {
      id: string;
      name: string;
      slug: string;
    } | null;
    correctAnswer: string;
  }>;
}
```

### Topic practice query params

- `limit`: optional, mặc định `10`

### Ghi chú practice

- practice payload được tạo động theo `topicSlug`
- KaTeX, `imageUrl` và `optionImageUrls` vẫn đi qua contract này
- `explanation` và `subtopic` vẫn được giữ trong practice payload để frontend có thể reuse review UI
- MVP hiện chỉ chấm điểm local ở frontend
- practice flow không tạo `Attempt` và không đi vào history

## Attempt / History APIs

| Method | Endpoint | Auth | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/exams/:id/attempts` | Protected | Lấy lịch sử làm bài của user hiện tại theo đề |
| `GET` | `/api/attempts/:attemptId` | Protected | Lấy chi tiết một lần làm bài nếu user là owner |

### Attempt detail response shape

```ts
{
  attempt: {
    id: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    submittedAt: string;
  };
  exam: {
    id: string;
    title: string;
  };
  answers: Array<{
    questionId: number;
    question: string;
    imageUrl: string | null;
    explanation: string | null;
    options: string[];
    optionImageUrls: Array<string | null>;
    subtopic: {
      id: string;
      name: string;
      slug: string;
    } | null;
    selectedOptionIndex: number | null;
    correctOptionIndex: number;
    isCorrect: boolean;
  }>;
  topicStats: TopicStatDto[];
}
```

### Ghi chú

- `imageUrl` dùng cho ảnh câu hỏi
- `explanation` là lời giải tĩnh của câu hỏi, có thể chứa KaTeX
- `optionImageUrls` map theo index với `options`
- `subtopic` là metadata bổ sung cho taxonomy MVP
- `POST /api/exam/submit` giữ response cũ và bổ sung `topicStats` theo hướng additive

## Auth APIs

| Method | Endpoint | Auth | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/api/auth/google` | Public | Đăng nhập bằng Google credential |
| `GET` | `/api/auth/me` | Protected | Lấy user hiện tại từ JWT |

### Auth response shape

```ts
{
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}
```

## Me / Analytics APIs

| Method | Endpoint | Auth | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/me/topic-stats` | Protected | Lấy thống kê độ chính xác theo topic của user hiện tại |
| `GET` | `/api/me/subtopic-stats` | Protected | Lấy thống kê độ chính xác theo subtopic của user hiện tại |
| `GET` | `/api/me/recommendations` | Protected | Lấy weak topics và đề nên làm tiếp |
| `GET` | `/api/me/progress` | Protected | Lấy summary tiến độ, recent attempts và progress theo thời gian |
| `GET` | `/api/me/attempts` | Protected | Lấy lịch sử làm bài toàn cục của user hiện tại |

### Topic stats response shape

```ts
{
  topicStats: Array<{
    topicId: string | null;
    topicName: string;
    topicSlug: string | null;
    correct: number;
    total: number;
    accuracy: number;
  }>;
}
```

### Subtopic stats response shape

```ts
{
  subtopicStats: Array<{
    subtopicSlug: string;
    subtopicName: string;
    topicSlug: string;
    topicName: string;
    totalAnswers: number;
    correctAnswers: number;
    accuracy: number;
    weak: boolean;
  }>;
}
```

### Recommendations response shape

```ts
{
  weakTopics: Array<{
    topicId: string | null;
    topicName: string;
    topicSlug: string | null;
    correct: number;
    total: number;
    accuracy: number;
    reason: string;
  }>;
  recommendedExams: Array<{
    examId: string;
    title: string;
    durationMinutes: number;
    matchedWeakTopicCount: number;
    matchedWeakQuestionCount: number;
    reason: string;
  }>;
}
```

### Progress response shape

```ts
{
  summary: {
    attemptCount: number;
    averageScore: number;
    bestScore: number;
    latestScore: number | null;
  };
  recentAttempts: Array<{
    attemptId: string;
    examId: string;
    examTitle: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    submittedAt: string;
  }>;
  progressByAttempt: Array<{
    attemptId: string;
    examTitle: string;
    score: number;
    accuracy: number;
    submittedAt: string;
  }>;
}
```

### Global attempts response shape

```ts
{
  attempts: Array<{
    attemptId: string;
    examId: string;
    examTitle: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    unansweredCount: number;
    durationSeconds: number | null;
    submittedAt: string;
  }>;
  summary: {
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
  };
}
```

### Query params cho `/api/me/attempts`

- `limit`: mặc định `20`
- `examId`: lọc lịch sử theo một đề cụ thể
- `sort`: hiện MVP chỉ hỗ trợ `latest`

### Ghi chú analytics

- Recommendation hiện vẫn là rule-based MVP
- `reason` có thể nhắc thêm subtopic nếu đề gợi ý có nhiều câu thuộc một nhóm con cụ thể
- Analytics hiện có topic-level và subtopic-level MVP; topic vẫn là lớp phân tích chính, subtopic dùng để chỉ ra mảng kiến thức nhỏ cần ôn lại
- `/api/me/progress` là nền dữ liệu cho dashboard `/analytics` và recent activity trong `/profile`
- `/api/me/attempts` là nền dữ liệu cho global history page `/history`

## Import script nội bộ

Import đề từ JSON hiện chưa phải HTTP API. MVP đang dùng backend script:

```bash
cd backend
npm run import:exam -- ./src/data/import/sample-exam.json
```

Xem format và rule chi tiết tại [docs/IMPORT_JSON.md](./IMPORT_JSON.md).
