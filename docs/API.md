# API ManMath

Base URL local: `http://localhost:5000`. Exam router được mount dưới `/api`; auth/me routers ở `/api/auth` và `/api/me`. Protected endpoints dùng `Authorization: Bearer <JWT>`.

## API V1 legacy

V1 vẫn active vì dashboard, practice, history, analytics và legacy exam flow đang dùng nó. V1 không phải contract cho content V2.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Health check |
| `GET` | `/api/exams` | Public | Exam summaries, search/filter |
| `GET` | `/api/exams/:id` | Public | Legacy exam detail |
| `GET` | `/api/topics` | Public | Topic/subtopic filter data |
| `GET` | `/api/practice/topic/:topicSlug` | Public | Dynamic topic practice, no persisted attempt |
| `POST` | `/api/exam/submit` | Optional JWT | Grade legacy option-index answers and persist attempt |
| `GET` | `/api/exams/:id/attempts` | Protected | Current user's attempts for a legacy exam |
| `GET` | `/api/attempts/:attemptId` | Protected | Owner-only legacy attempt detail/review |

`GET /api/exams` supports `search`, `topic`, `subtopic`, `durationMin`, `durationMax`, `difficulty`, `year` and `source`. Invalid numeric/difficulty query values return `400`.

### Legacy security note

Legacy detail/practice contracts include `correctAnswer` and use numeric question IDs plus option indices. This is known answer-key leakage and is retained only for coexist compatibility. New V2 frontend work must not depend on this behavior.

`POST /api/exam/submit` accepts optional auth. Anonymous requests are graded and persisted without an owner; valid JWT requests associate the attempt with the user. Legacy score is an integer-rounded V1 representation, not V2 score units.

## API V2 exam engine

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v2/exams/:id` | Public | Read validated public V2 content |
| `POST` | `/api/v2/exams/:id/grade` | Public | Grade raw typed responses without persisting |
| `POST` | `/api/v2/exams/:id/attempts` | Optional JWT | Grade and persist a V2 attempt |
| `GET` | `/api/v2/attempts/:attemptId` | Protected | Read authenticated owner's safe V2 receipt |

### `GET /api/v2/exams/:id`

Purpose: expose a public exam DTO for V2 taking UI. Backend reconstructs persisted question storage, validates it at runtime and strips `answerKey` before responding.

High-level output contains exam metadata and discriminated public questions. Questions use stable string external IDs, with choice IDs for `single_choice`, statement IDs for `true_false_group`, and no key material for `short_answer`.

`404` means no exam; `409` means an existing exam does not provide V2 content; invalid persisted V2 content returns `500` without exposing validation details.

### `POST /api/v2/exams/:id/grade`

Purpose: grade a payload shaped as `{ responses: RawSubmittedResponse[] }` without creating an attempt.

Each response must belong to the exam, appear at most once and match the public question type. Valid responses are normalized before grading. Output includes policy ID, total awarded score, policy maximum and one result per question.

This route is public and does not return answer keys. It does return correctness and awarded score for submitted responses, so it should be treated as a potential grading oracle until a future policy/rate-limiting decision is made.

### `POST /api/v2/exams/:id/attempts`

Purpose: validate, grade and persist `{ responses, durationSeconds? }`.

`durationSeconds` must be a non-negative integer when provided. The response contains attempt ID, scoring policy, score/max score units, counts, submission time and per-question grading results. Persistence is one Prisma transaction that creates `Attempt` and all `AttemptAnswer` rows.

JWT is optional. A valid JWT sets attempt ownership; anonymous attempts are stored without an owner and cannot later be retrieved by the receipt API.

### `GET /api/v2/attempts/:attemptId`

Purpose: reload a safe result receipt for the authenticated owner.

Output contains attempt metadata and per-question external ID, type, normalized submitted response or `null`, awarded/max score units and fully-correct status. It deliberately excludes answer keys and explanations. A missing result covers absent attempts, another user's attempt and anonymous attempts.

## V2 exam content and attempts

V2 keeps stable public string question IDs and does not expose answer keys from
the public exam or attempt receipt endpoints.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v2/exams/:id` | Public | Public V2 exam content for the three question types |
| `POST` | `/api/v2/exams/:id/attempts` | Optional JWT | Validate, grade, and persist a V2 attempt |
| `GET` | `/api/v2/attempts/:attemptId` | Protected owner | Safe V2 attempt receipt without correct answers |
| `GET` | `/api/v2/attempts/:attemptId/review` | Protected owner | Snapshot-backed review with correct answers after submission |

`GET /api/v2/attempts/:attemptId/review` is intentionally unavailable to
anonymous attempts. It returns correct answers from the persisted snapshot, but
never returns the raw snapshot or an explanation. A V2 attempt created before
snapshots were introduced returns `409` from this endpoint.

## Auth APIs

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/google` | Public | Verify Google credential and issue JWT |
| `GET` | `/api/auth/me` | Protected | Read current JWT user |

Login response contains `{ token, user }`, where user includes id, email, full name and avatar URL.

## Me and analytics APIs

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/me/topic-stats` | Protected | Accuracy by topic |
| `GET` | `/api/me/subtopic-stats` | Protected | Accuracy by subtopic |
| `GET` | `/api/me/recommendations` | Protected | Rule-based weak topics and recommended exams |
| `GET` | `/api/me/progress` | Protected | Summary, recent attempts and progress trend |
| `GET` | `/api/me/attempts` | Protected | Paginated global owner history |

`/api/me/attempts` accepts `page`, `limit`, optional `examId` and `sort=latest`. Page defaults to `1`, limit defaults to `10` and has maximum `50`. The service returns page metadata and a summary for the user's full history, not only the current page.

Analytics remains rule-based. It reads shared `Attempt` data during V1/V2 coexist; V2 partial true/false scoring is not yet represented as a separate analytics metric.

## Import APIs

Import is not an HTTP API. Use backend CLI scripts documented in [IMPORT_JSON.md](IMPORT_JSON.md).
