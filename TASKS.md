# Product tasks

Tài liệu này chỉ theo dõi trạng thái sản phẩm và technical debt còn mở. Kiến trúc, API và data model có canonical docs riêng trong `docs/`.

## Current state

- [x] Runtime và Prisma schema hiện tại là V2-only.
- [x] Published `ExamVersion` là nguồn nội dung public duy nhất.
- [x] Taking, grading, attempt, receipt/review, history, analytics, recommendations và practice dùng V2 identities.
- [x] `AttemptAnswer.examVersionQuestionId` là canonical required reference, unique trong mỗi attempt.
- [x] Legacy `Question`, `contentEngine`, numeric answer identity và option-index attempt fields đã được retire.
- [x] Public/practice DTO không lộ answer key; owner review là explicit authorized boundary.
- [x] Isolated verification full suite đã pass sau migration.

## Current follow-up

- [ ] Duy trì manual QA desktop/tablet/mobile cho taking, result/review và practice.
- [ ] Chạy Playwright trên môi trường có Chromium và disposable `_verify` database khi release.
- [ ] Quyết định abuse/rate-limit policy cho public grading endpoints.
- [ ] Theo dõi nullable historical columns trên `Attempt`; runtime V2 vẫn phải reject/exclude malformed rows thay vì synthesize facts.
- [ ] Giữ docs và import example đồng bộ khi thêm exam/version mới.

## Deferred product scope

- [ ] Refresh token và account-management đầy đủ.
- [ ] Persisted staff roles thay cho draft-preview email allowlist.
- [ ] Admin content management và image upload.
- [ ] Word/PDF/Excel/OCR import.
- [ ] Explanation/solution reveal policy.
- [ ] AI tutor, payment, leaderboard, social features và mobile app.

## Historical Context

Các milestone dưới đây đã hoàn thành và được giữ lại như engineering record:

- V2 domain contract đưa stable external IDs, discriminated question types và runtime validation vào hệ thống.
- Grading được chuyển khỏi frontend option-index comparison sang backend ScoreUnits.
- Draft/published versioning, readiness profiles và immutable database triggers được bổ sung.
- Practice, analytics, recommendations, history và frontend navigation được migrate sang V2-only.
- Attempt identity được migrate theo ba bước: additive canonical FK, required/unique constraint, rồi retire ordinal `questionId`.
- Final schema cleanup xóa legacy `Question`, `contentEngine` và option-index fields sau read-only preflight và isolated verification.

Applied migration files vẫn giữ tên và SQL lịch sử. Chúng là migration history, không phải active runtime architecture.
