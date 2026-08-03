# UI design system

## Concept 2 — Minimalist & Focus

ManMath ưu tiên cảm giác học tập tập trung, học thuật và ít mệt mỏi. UI giúp người học hiểu việc cần làm tiếp theo thay vì mô phỏng dashboard dữ liệu hoặc sản phẩm AI chung chung.

## Không gian giao diện

- **Public:** landing nhẹ, giải thích flow sản phẩm bằng copy HTML và screenshot thật từ ManMath.
- **Workspace:** dashboard, analytics, history và profile; ưu tiên mật độ vừa phải, đọc nhanh và navigation ổn định.
- **Focus:** làm đề, result/review, attempt detail và practice; không render sidebar/header workspace để giữ sự tập trung.

## Màu sắc

| Vai trò | Token / giá trị |
| --- | --- |
| Primary | `#3B82F6` |
| Primary hover | `#2563EB` |
| Background | `#F8FAFC` |
| Surface | `#FFFFFF` |
| Text primary | `#0F172A` |
| Muted | `#64748B` |
| Border | `#E2E8F0` |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |

Blue là accent chung. Success, warning và danger chỉ thể hiện trạng thái semantic; không dùng violet, magenta hoặc gradient trang trí như màu thương hiệu.

## Typography và mật độ

- Workspace dùng Inter hoặc system stack tương đương, trong `.workspace-shell`.
- Weight giới hạn ở 400, 500, 600 và 700; page title dùng 700, metadata dễ đọc và không nhỏ hơn 13px trên desktop.
- Số điểm, timer, thời lượng, phần trăm và số câu dùng tabular figures.
- Public giữ typography riêng khi cần; focus ưu tiên khả năng đọc đề và công thức.
- Dùng một container/gutter nhất quán trong từng màn; section có hierarchy rõ thay vì mọi khối đều là card.

## Bề mặt và component

- Border mảnh, radius vừa phải, shadow chỉ dùng khi cần xác lập hierarchy.
- List học tập ưu tiên row/divider thay vì card lớn lặp lại.
- Button chính chỉ có một hành động nổi bật trong mỗi vùng; action phụ dùng outline hoặc text link.
- Empty state phải nói rõ thiếu dữ liệu hay thiếu đăng nhập, không dùng số liệu hoặc recommendation giả.

## Accessibility và responsive

- Có skip link, `focus-visible` rõ ràng, hit area tối thiểu 44px với action chính.
- Decorative SVG phải `aria-hidden`; ảnh screenshot có alt mô tả chức năng thật.
- Tôn trọng `prefers-reduced-motion`; không phụ thuộc animation để hiểu nội dung.
- Mobile hiển thị copy trước visual, tránh ép screenshot desktop nhỏ không đọc được, không horizontal overflow.

## Không làm

- Không gradient tím-xanh, neon, glassmorphism, blob ngẫu nhiên, parallax, typewriter hoặc animation library.
- Không fake learner counts, testimonial, user avatar, score, recommendation hoặc claim “free”.
- Không dựng lại screenshot sản phẩm bằng HTML/div hoặc biến ảnh thật thành UI khác.
