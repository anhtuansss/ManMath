# Product tasks

Tài liệu này chỉ phản ánh trạng thái product hiện tại. Chi tiết kiến trúc, API và design system nằm trong `docs/`.

## Completed

- [x] Public landing page tại `/` và workspace tại `/dashboard`.
- [x] Route groups `(public)`, `(workspace)` và `(focus)`; `/exams` redirect về `/dashboard`.
- [x] Danh sách đề, search/filter, làm đề, timer, autosave và khôi phục bài làm.
- [x] Submit, score, result/review, explanation, KaTeX, question/option images và result navigator.
- [x] PostgreSQL + Prisma, seed demo và import JSON single/batch/dry-run.
- [x] Google Login + JWT; history và attempt detail kiểm tra ownership.
- [x] History global có server-side pagination và summary cho toàn bộ history.
- [x] Analytics topic/subtopic, progress, recommendation rule-based và practice theo topic.
- [x] Profile, dashboard, analytics, history và result/review đã được đồng bộ theo Concept 2 — Minimalist & Focus.
- [x] Accessibility baseline: skip link, focus-visible, responsive public/workspace/focus layouts.

## Current

- [ ] Manual visual QA cho desktop, tablet và mobile sau các UI pass gần đây.
- [ ] Documentation synchronization và kiểm tra link nội bộ.

## Next

- [ ] Mở rộng subtopic analytics/recommendation khi taxonomy và dữ liệu câu hỏi đủ ổn định.
- [ ] Bổ sung test coverage cho submit, ownership và pagination history.
- [ ] Mở rộng content pipeline ngoài JSON: Excel và Word.

## Later / Deferred

- [ ] Refresh token và email/password login.
- [ ] Cập nhật thông tin hồ sơ và password.
- [ ] Admin exam management và upload ảnh qua web.
- [ ] Import PDF/OCR.
- [ ] AI feedback, AI explanation runtime và AI tutor.
- [ ] Payment, leaderboard, social features, mobile app và thi thử nhiều người.

## Không làm lúc này

- [ ] Không gọi recommendation rule-based là AI.
- [ ] Không thêm claim sản phẩm hoặc feature chưa có trong code.
