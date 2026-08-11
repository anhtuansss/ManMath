# Product tasks

Tài liệu này phản ánh trạng thái được xác minh từ code hiện tại. Chi tiết architecture, API và data model nằm trong `docs/`.

## Completed

- [x] Public landing tại `/`, workspace tại `/dashboard`, và `/exams` redirect tương thích.
- [x] Route groups `(public)`, `(workspace)` và `(focus)`.
- [x] Legacy exam flow: danh sách đề, filter, timer, autosave, submit, result/review, KaTeX và ảnh câu hỏi/đáp án.
- [x] Google Login + JWT; ownership cho history và legacy attempt detail.
- [x] History phân trang phía server; analytics topic/subtopic, profile và recommendation rule-based.
- [x] Legacy JSON importer: single file, manifest batch và dry-run.
- [x] V2 domain contract: discriminated union, stable external question/choice/statement IDs và runtime validator.
- [x] 3A - V2 public read API, không trả answer key.
- [x] 3B - V2 server-side grading với policy `vietnam_thpt_math_2025`.
- [x] 3C - V2 attempt persistence trong Prisma transaction.
- [x] 3D - V2 frontend exam-taking route với stable string answer IDs và autosave browser.
- [x] 3E - V2 result session và authenticated owner receipt.
- [x] Documentation synchronization cho V1/V2 coexist, persistence, API, import và scoring.

- [x] 5B - Coexistence engine classification: additive `legacy`/`v2` metadata and validator-backed audit.
- [x] 5C - V2 analytics aggregates persisted score-unit facts; legacy analytics is explicitly best-effort.
- [x] 5D - HTTP integration verification covers discovery metadata, public answer-key safety, grading, and receipt ownership.

## Core completion status

- [x] 5B–5D: engine classification, score-unit analytics and HTTP security integration.
- [x] 6A–6D: draft/published versioning, readiness profiles, publish flow and version-pinned V2 attempts.
- [x] 7A–7B: explicit owner-only answer-key review and seven-day anonymous safe receipt recovery.
- [x] 8A–8B: database immutability, legacy/V2 containment and read-only historical coverage audit.
- [x] 9: Playwright suite committed; browser execution is pending the Chromium artifact download in this environment.
- [x] 10: production configuration guard, liveness/readiness endpoints and deployment/testing/import documentation.

## Current

- [ ] Manual QA desktop/tablet/mobile cho cả legacy và V2 routes.
- [ ] Xác minh V2 import/read/grade/persist scripts trên database development dùng chung.
- [ ] Quyết định chiến lược migration để dashboard và recommendation chọn V2 content khi phù hợp.

## Next

- [ ] Hoàn thiện V2 attempt detail/review flow không phụ thuộc legacy `correctOptionIndex`.
- [ ] Thiết kế exam/content versioning và immutable attempt snapshot trước khi dùng lịch sử V2 như dữ liệu lâu dài.
- [ ] Mở rộng analytics/recommendation để diễn giải partial true/false score theo V2.
- [ ] Bổ sung test coverage cho submit, ownership, pagination history và V2 API boundaries.

## Deferred

- [ ] Review-answer reveal policy cho V2, bao gồm answer key và explanation.
- [ ] Refresh token, email/password login, cập nhật profile/password.
- [ ] Admin exam management, upload ảnh qua web, Excel/Word/PDF/OCR import.
- [ ] AI feedback, AI explanation runtime và AI tutor.
- [ ] Payment, leaderboard, social features, mobile app và thi thử nhiều người.

## Không claim lúc này

- [ ] Không gọi recommendation rule-based là AI.
- [ ] Không gọi V2 migration là hoàn tất khi V1/V2 vẫn cùng tồn tại.
- [ ] Không mô tả ứng dụng là production-ready khi security, versioning và compatibility debt còn mở.
