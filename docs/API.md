# API

Public V2 routes:

- `GET /api/exams` — published exam discovery.
- `GET /api/v2/exams/:id` — answer-key-free published content.
- `POST /api/v2/exams/:id/grade` — server-side grading without persistence.
- `POST /api/v2/exams/:id/attempts` — create a pinned attempt.
- `GET /api/v2/attempts/:attemptId` — authenticated owner receipt.
- `GET /api/v2/attempts/:attemptId/review` — authenticated owner review.
- `GET /api/v2/practice/topic/:topicSlug` and `POST /api/v2/practice/grade` — V2 practice.

Draft preview is internal-only at `GET /api/v2/internal/exam-previews/:id`.
