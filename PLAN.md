# Kế hoạch nâng cấp Landing Page và Dashboard ManMath

# Executive Recommendation

Tách trải nghiệm thành hai lớp:

- `/`: landing page công khai, luôn hiển thị cho cả khách và người đã đăng nhập.
- `/dashboard`: không gian luyện đề, vẫn cho phép khách sử dụng để bảo toàn luồng làm đề hiện tại. Nội dung cá nhân hóa chỉ xuất hiện sau đăng nhập.
- `/exams`: chuyển hướng tạm thời tới `/dashboard` để giữ tương thích.
- Các route thi, kết quả, lịch sử và analytics giữ nguyên URL và hợp đồng dữ liệu.

Đây là phương án cân bằng tốt nhất giữa thương hiệu, SEO, khả năng demo và rủi ro kỹ thuật. Không nên biến `/dashboard` thành route bắt buộc đăng nhập vì hiện tại người dùng chưa đăng nhập vẫn có thể làm đề, autosave và xem kết quả.

Design read: landing page EdTech cho học sinh THPT Việt Nam, ngôn ngữ tối giản, học thuật, tập trung và tin cậy.

- `DESIGN_VARIANCE: 5/10`
- `MOTION_INTENSITY: 3/10`
- `VISUAL_DENSITY: 4/10`
- Theme MVP: light mode nhất quán.
- Visual MVP: product screenshot thật kết hợp bố cục toán học CSS/SVG.
- Không dùng typewriter, parallax, WebGL, Three.js hoặc animation lặp.
- Không thêm dependency.
- Không thay đổi backend, API, database, autosave, submit hoặc result persistence.

Bộ copy được đề xuất:

- Headline: **Luyện đề Toán như một buổi thi thật.**
- Subheadline: **Chọn đề, làm bài có bấm giờ, xem lại đáp án và biết chuyên đề nào cần ôn tiếp.**
- CTA chính cho khách: **Bắt đầu luyện đề**
- CTA chính cho người đã đăng nhập: **Vào trang luyện tập**
- CTA phụ: **Xem cách ManMath hoạt động**

Frontend hiện tại đã vượt qua `npm run type-check` và `npm run build` với Next.js 16.2.2, React 19.2.4 và Tailwind CSS 4.2.2. Đây là baseline cần được giữ sau từng phase.

# Current Product Audit

## Routing và layout hiện tại

- [`app/page.tsx`](C:/Users/LOQ/Desktop/manmath/frontend/src/app/page.tsx:12) và [`app/exams/page.tsx`](C:/Users/LOQ/Desktop/manmath/frontend/src/app/exams/page.tsx:13) cùng render `ExamListClient`.
- [`app/layout.tsx`](C:/Users/LOQ/Desktop/manmath/frontend/src/app/layout.tsx:28) áp dụng `AuthProvider`, `AppSidebar` và `AppHeader` cho toàn bộ ứng dụng.
- Các màn focus không có layout riêng. `AppSidebar` và `AppHeader` tự kiểm tra pathname rồi trả về `null` cho `/exam/*`, `/attempts/*` và `/practice/topic/*`.
- Dù sidebar bị ẩn, wrapper toàn cục vẫn tồn tại. Nếu chỉ thay nội dung `/` bằng landing page, landing vẫn bị ràng buộc bởi cấu trúc app shell và logic client-side của shell.
- `AppSidebar` tạo sidebar 256px trên desktop và bottom navigation 64px trên mobile. Parent layout luôn thêm `pb-16`, kể cả khi một route không cần bottom navigation.
- `/about` hiện cũng nằm trong app shell dù về bản chất là trang công khai.

## Trang `/` và dashboard hiện tại

[`ExamListClient.tsx`](C:/Users/LOQ/Desktop/manmath/frontend/src/components/exam/ExamListClient.tsx) chịu trách nhiệm:

- Gọi `GET /api/exams` và `GET /api/topics`.
- Quản lý toàn bộ search/filter.
- Tìm bài đang làm dở trong `localStorage`.
- Xử lý loading, initial error và empty states.
- Debounce filter 250ms.

[`ExamList.tsx`](C:/Users/LOQ/Desktop/manmath/frontend/src/components/exam/ExamList.tsx:150) đang render:

1. Lời chào chung.
2. Banner bài đang làm dở nếu có.
3. Ba đề “đề xuất”.
4. Search và sáu loại filter.
5. Active filter chips.
6. Danh sách đề dạng compact.
7. Footer.

Các vấn đề chính:

- `recommendedExams = exams.slice(0, 3)` không phải recommendation thật. Nếu tiếp tục dùng tên “Đề luyện thi đề xuất”, giao diện đang diễn đạt quá mức dữ liệu thực tế.
- Khi user đang filter, ba đề đầu tiên của kết quả filter cũng trở thành “đề xuất”.
- Bài làm dở chỉ xuất hiện nếu exam tương ứng có trong mảng hiện tại. Filter có thể làm banner biến mất.
- Search, filter, recommendations và library đều nằm trong một khối có trọng lượng thị giác gần tương đương.
- Quá nhiều cấu trúc `rounded-xl + border + bg-surface + shadow-card`.
- `ExamCard` featured, library panel, filter panel, recommendation và analytics đều dùng cùng ngôn ngữ card.
- Nút “Lưu đề” trên `ExamCard` chưa có hành vi lưu thật. Đây là affordance gây hiểu nhầm và nên được loại bỏ hoặc disabled cho đến khi có chức năng.

## AppSidebar và AppHeader

[`AppSidebar.tsx`](C:/Users/LOQ/Desktop/manmath/frontend/src/components/layout/AppSidebar.tsx:52):

- Link đầu tiên trỏ tới `/`, label “Trang chủ”, alias `/exams`.
- Sau khi tách landing page, link này phải chuyển thành `/dashboard` với label mang ý nghĩa sản phẩm như “Luyện đề”.
- Mobile navigation hiện có bốn mục, phù hợp với số lượng route hiện tại.
- Các icon là SVG khai báo trực tiếp trong file. Có thể giữ để tránh thêm dependency nhưng cần thống nhất stroke và trạng thái focus.

[`AppHeader.tsx`](C:/Users/LOQ/Desktop/manmath/frontend/src/components/layout/AppHeader.tsx:20):

- Trên desktop gần như chỉ chứa `AuthButton`.
- Trên mobile chứa logo dẫn về `/`.
- Sau migration, logo trong app shell nên dẫn về `/dashboard`.
- Public landing cần header riêng, không dùng `AppHeader`.

## Auth hiện tại

- JWT được lưu trong `localStorage` tại [`authStorage.ts`](C:/Users/LOQ/Desktop/manmath/frontend/src/lib/authStorage.ts).
- Không có auth state trung tâm. Mỗi màn tự gọi `getCurrentUser`.
- `AuthButton`, analytics, history và profile đều subscribe sự kiện `manmath-auth-token-changed`.
- `GoogleOAuthProvider` hiện nằm ở root layout, khiến mọi route đều đi qua client provider dù không cần login UI.
- Analytics, history và profile không bị bảo vệ bằng middleware. Chúng render client-side rồi hiển thị unauthorized state khi không có token.
- Exam submit đọc token trực tiếp từ storage và gửi token nếu có. Khách vẫn submit được.
- Không nên thêm middleware hoặc redirect auth trong dự án redesign này vì sẽ thay đổi behavior hiện tại.

Landing page chỉ cần một client island nhỏ đọc token để đổi CTA. Google Login thực tế vẫn đặt trong app workspace.

## Liên kết route có nguy cơ bị phá

Có nhiều link tĩnh `href="/"` trong:

- `ExamHeader`
- `ExamTakingClient`
- `ExamResultClient`
- `ExamAttemptsClient`
- `AttemptDetailClient`
- `PracticeClient`
- `AnalyticsClient`
- `HistoryClient`
- `ProfileClient`
- `ErrorBoundary`
- `AppHeader`
- `AppSidebar`

Sau migration phải phân biệt rõ:

- Brand link của landing: `/`
- Brand link trong workspace hoặc focus mode: `/dashboard`
- “Quay về danh sách đề”: `/dashboard`
- Global fatal error: `/`
- `/exams`: route tương thích chuyển hướng về `/dashboard`

Việc thay nội dung `/` mà không audit các link này sẽ khiến người dùng thoát khỏi bài thi và bất ngờ quay về marketing page.

## Mobile navigation

- Bottom navigation chỉ nên tồn tại trong workspace layout.
- Landing không được có bottom navigation.
- Focus mode tiếp tục không có global navigation.
- Parent `pb-16` phải được chuyển từ root layout vào workspace layout.
- Safe-area bottom cần được tính cả trong chiều cao nội dung, không chỉ trong nav.
- Mobile public header chỉ cần logo và CTA. Không cần hamburger cho ba anchor link landing, giúp giảm JS và tránh menu không cần thiết.

## Component có thể tái sử dụng

Giữ và tinh chỉnh:

- `Logo`: giữ biểu tượng hiện tại để không âm thầm thay brand.
- `ExamCard`: dùng trong dashboard, không đặt trực tiếp vào hero.
- `AuthButton` và `AuthProvider`: chuyển vào workspace layout.
- `Skeleton`, `EmptyState`, `ErrorCard`, `Button`: giữ API hiện tại, đồng bộ lại tokens.
- `RecommendationCard` và `UserTopicStatsCard`: tái sử dụng dữ liệu, cải tổ presentation.
- `ExamHeader`, question navigation, timer, result review: giữ nguyên behavior.

Nên thay hoặc tách:

- `Footer` hiện tại quá tối giản và gắn với exam list. Landing cần `PublicFooter` riêng.
- Public header phải là component riêng, không cố tái sử dụng `AppHeader`.
- `ExamList` nên được xem như dashboard content thay vì homepage.
- Hero và product proof không được dựng bằng các khối `div` giả lập screenshot. Phải dùng ảnh chụp thật từ route ManMath với dữ liệu seed/demo thật.

## Visual system hiện tại

- Primary indigo `#4F46E5` và accent teal `#0F766E` tạo hai màu nhấn cạnh tranh.
- Token `Outfit` tồn tại nhưng font không được load. Root layout lại ép system font bằng inline style, vì vậy heading thực tế vẫn dùng fallback.
- Metadata root hiện viết tiếng Việt không dấu.
- Màu muted `#94A3B8` có nguy cơ thiếu tương phản khi dùng cho text nhỏ.
- Focus outline toàn cục được khai báo rồi bị xóa cho mọi `button`, `a` và `[role=button]`. Một số control không tự bổ sung focus ring nên keyboard focus có thể biến mất.
- `RecommendationCard` còn nhiều copy không dấu.
- Nhiều client import `Logo` nhưng không sử dụng.
- Một số avatar link có `alt=""` mà không có accessible name riêng.

## Giới hạn của audit

Attachment hiện tại chỉ có `pasted-text.txt`, không có ảnh UI. Phần visual audit trên được xác minh từ code và design tokens, chưa có đối chiếu pixel với screenshot bên ngoài.

Worktree đang có nhiều thay đổi chưa commit. Khi triển khai phải bảo toàn các thay đổi này và chia redesign thành commit độc lập, không reset hoặc ghi đè file ngoài phạm vi.

# Route and Product Architecture Options

| Tiêu chí | Phương án 1: giữ `/` là dashboard, thêm hero | Phương án 2: `/` landing, `/dashboard` workspace | Phương án 3: `/` tự đổi theo auth |
|---|---|---|---|
| First impression | Trung bình. Hero vẫn nằm trong app shell | Rất tốt. Landing có narrative và visual hierarchy riêng | Không ổn định vì cùng URL có hai trải nghiệm |
| User mới | Hiểu sản phẩm tốt hơn hiện tại nhưng nhanh bị đẩy vào filter/library | Hiểu rõ giá trị trước khi vào app | Có thể tốt khi chưa login nhưng khó dự đoán sau login |
| User đã login | Nhanh, không đổi thói quen | Thêm một route nhưng CTA đưa thẳng vào workspace | Tiện ở lần đầu, nhưng back/history khó hiểu |
| Routing complexity | Thấp | Trung bình | Trung bình đến cao do redirect hoặc conditional client rendering |
| Auth behavior | Không đổi | Không đổi; dashboard hỗ trợ guest | Phụ thuộc localStorage nên chỉ quyết định được sau hydration |
| SEO | Trung bình vì nội dung chính vẫn là client dashboard | Cao nhất vì `/` có HTML tĩnh và metadata riêng | Yếu, crawler và user có thể thấy nội dung khác nhau |
| Demo tuyển dụng | Trung bình | Tốt nhất, không cần login để thấy brand và sản phẩm | Khó demo nhất quán |
| Mở rộng | Hero và app tiếp tục dính nhau | Có ranh giới public, workspace và focus rõ | Nhiều conditional behavior tích tụ ở root |
| Migration cost | Thấp | Trung bình | Trung bình |
| Rủi ro flow hiện tại | Thấp | Trung bình nếu không audit back links | Cao do redirect, hydration và auth expiry |
| Hiệu năng landing | Yếu vì vẫn mang app shell và Google provider | Tốt nhất | Trung bình |
| Khuyến nghị | Không chọn | Chọn | Không chọn |

# Recommended Product Architecture

## Route contract đã chốt

| Route | Vai trò | Auth behavior | Shell |
|---|---|---|---|
| `/` | Public landing | Luôn hiển thị, không auto-redirect | Public layout |
| `/dashboard` | Workspace luyện đề | Guest dùng được; module cá nhân hóa yêu cầu token | Workspace layout |
| `/exams` | Legacy compatibility | Server redirect tạm thời tới `/dashboard` | Không render duplicate |
| `/analytics` | Phân tích cá nhân | Unauthorized state giữ nguyên | Workspace layout |
| `/history` | Lịch sử cá nhân | Unauthorized state giữ nguyên | Workspace layout |
| `/profile` | Hồ sơ | Unauthorized state giữ nguyên | Workspace layout |
| `/about` | Giới thiệu dự án | Công khai | Public layout |
| `/exam/[id]` | Focus exam | Guest hoặc logged-in | Focus layout |
| `/exam/[id]/result` | Kết quả submit hiện tại | Theo sessionStorage hiện hành | Focus layout |
| `/exam/[id]/attempts` | Lịch sử theo đề | API protected như hiện tại | Focus layout |
| `/attempts/[attemptId]` | Chi tiết attempt | API protected như hiện tại | Focus layout |
| `/practice/topic/[topicSlug]` | Focus practice | Behavior hiện tại | Focus layout |

## Cấu trúc layout

Dùng App Router route groups để thể hiện ranh giới kiến trúc:

- `(public)`: landing và about.
- `(workspace)`: dashboard, exams redirect, analytics, history và profile.
- `(focus)`: exam, result, attempts và practice.
- Root layout chỉ giữ HTML, global tokens và global error boundary.
- `AuthProvider`, `AppSidebar`, `AppHeader` và mobile padding chỉ nằm trong workspace layout.
- KaTeX CSS chuyển khỏi public landing và chỉ được load trong focus layout.

Route groups không làm thay đổi URL công khai.

## Auth và data flow

Landing:

1. Server render toàn bộ copy và sections.
2. Client island nhỏ đọc auth token sau mount.
3. Không có token: hiển thị CTA “Bắt đầu luyện đề”.
4. Có token: hiển thị CTA “Vào trang luyện tập”.
5. Cả hai CTA cùng đi `/dashboard`.
6. Landing không gọi API và không phụ thuộc backend để render.

Dashboard:

1. `ExamListClient` tiếp tục gọi exam và topic APIs.
2. Guest thấy draft local, “Bắt đầu nhanh”, search/filter và exam library.
3. Logged-in gọi thêm progress và recommendation endpoints hiện có.
4. Chỉ dữ liệu từ `/api/me/recommendations` được gọi là “Đề nên làm tiếp”.
5. Nếu recommendation lỗi, exam library vẫn hoạt động.
6. Không đổi API DTO, token storage hoặc autosave schema.

## SEO

- `/` là static/server-rendered landing với H1, copy thật và metadata tiếng Việt có dấu.
- `/dashboard`, analytics, history và profile đặt `robots: noindex, follow`.
- `/exams` redirect để tránh duplicate content.
- `/about` có thể index.
- Không đặt domain canonical hoặc `metadataBase` giả. Chỉ thêm sau khi có domain production thật.
- Không đưa số lượng user, lượt làm, testimonial hoặc metrics giả vào metadata hay nội dung.

# Landing Page Information Architecture

## 1. Public navigation

- Mục tiêu UX: xác định brand, cho user biết đây là trang công khai và luôn có đường vào sản phẩm.
- Nội dung: logo ManMath, “Cách hoạt động”, “Kết quả”, “Về ManMath”, CTA.
- Thứ tự: logo, anchor links, CTA.
- CTA: “Bắt đầu luyện đề” hoặc “Vào trang luyện tập”.
- Visual: header cao 64-72px, nền cùng canvas, border bottom chỉ xuất hiện khi sticky.
- Desktop: anchor links trên một dòng, không quá bốn mục.
- Mobile: chỉ logo và CTA, ẩn anchor links, không hamburger.
- Dữ liệu thật: không cần API.
- Không được bịa: badge beta, user count, trust logos hoặc status giả.
- Cần thiết: có.

## 2. Hero

- Mục tiêu UX: trong vài giây phải hiểu ManMath là gì, cho ai và hành động tiếp theo.
- Nội dung theo thứ tự: headline, subheadline, hai CTA, microcopy theo auth.
- CTA chính: `/dashboard`.
- CTA phụ: `#cach-hoat-dong`.
- Visual: asymmetric split. Bên phải là screenshot thật của exam-taking UI kết hợp hệ trục hoặc đường cong toán học tĩnh.
- Desktop: copy chiếm khoảng 5/12 cột, visual 7/12; CTA phải nằm trong viewport đầu ở màn hình cao 768px.
- Mobile: copy trước, visual sau; H1 tối đa ba dòng; CTA full-width hoặc hai hàng; không dùng hero `100vh`.
- Component: `HeroSection`, `LandingAuthActions`, `MathProductVisual`.
- Dữ liệu thật: screenshot từ route exam chạy với dữ liệu seed/demo.
- Không được bịa: điểm số, số học sinh, lời hứa tăng điểm, nhãn “AI”.
- Cần thiết: có.

## 3. Vòng luyện tập

- Mục tiêu UX: giải thích luồng giá trị của sản phẩm mà không dùng một hàng ba card generic.
- Nội dung: “Chọn đề”, “Làm trong thời gian”, “Xem lại và ôn tiếp”.
- Thứ tự: một narrative flow liên tục, dùng động từ làm tiêu đề.
- CTA: không cần CTA mới; có thể dùng text link tới `/dashboard`.
- Visual: một trục tiến trình đơn giản hoặc ba nhóm text nối bằng khoảng trắng và một đường định hướng, không icon-card.
- Desktop: layout ngang bất đối xứng.
- Mobile: ba nhóm xếp dọc, thứ tự DOM giữ nguyên.
- Component: `PracticeLoopSection`.
- Dữ liệu thật: timer, autosave, result review và topic analytics đã được xác minh trong code.
- Không được bịa: thời gian tiến bộ hoặc mức tăng điểm.
- Cần thiết: có vì user mới cần hiểu product loop.

## 4. Trải nghiệm làm đề

- Mục tiêu UX: chứng minh ManMath là sản phẩm hoạt động thật, không chỉ là marketing.
- Nội dung: timer, question navigation, autosave, giao diện tập trung.
- Thứ tự: screenshot thật, headline ngắn, ba lợi ích có thể kiểm chứng.
- CTA: “Vào kho đề”.
- Visual: ảnh chụp thật `/exam/[id]`, không dựng fake dashboard bằng div.
- Desktop: media chiếm phần lớn chiều rộng, copy nằm cạnh hoặc phía dưới.
- Mobile: crop tập trung vào câu hỏi, timer và navigator; không ép toàn bộ desktop screenshot vào chiều rộng nhỏ.
- Component: `ExamExperienceSection`, `ProductScreenshot`.
- Dữ liệu thật: exam seed và UI hiện hành.
- Không được bịa: không gọi autosave là cloud sync vì hiện tại dùng `localStorage`.
- Cần thiết: có.

## 5. Kết quả và hướng ôn tiếp

- Mục tiêu UX: thể hiện giá trị sau khi submit, điểm khác biệt quan trọng so với một kho PDF.
- Nội dung: score review, đáp án, explanation, topic/subtopic analytics và recommendation rule-based.
- Thứ tự: headline, screenshot result/analytics, giải thích ngắn.
- CTA: “Xem cách phân tích hoạt động” dẫn tới anchor nội bộ hoặc `/dashboard`.
- Visual: screenshot thật từ một lần submit demo; caption ghi rõ “Ví dụ giao diện từ một lượt làm thử”.
- Desktop: bố cục media lớn kết hợp một cột giải thích.
- Mobile: screenshot dùng crop riêng; bảng hoặc progress bar không tràn ngang.
- Component: `LearningInsightSection`.
- Dữ liệu thật: một attempt được tạo qua flow submit thật.
- Không được bịa: không gọi recommendation là AI, không dùng số liệu demo như social proof.
- Cần thiết: có.

## 6. Khác biệt của ManMath

- Mục tiêu UX: củng cố quyết định dùng thử.
- Nội dung: bốn dòng đối chiếu ngắn:
  - Mô phỏng buổi làm đề có thời gian.
  - Lưu nháp ngay trên thiết bị.
  - Xem lại từng câu sau khi nộp.
  - Dùng kết quả thật để gợi ý phần cần luyện.
- Visual: các hàng editorial với typography và khoảng trắng, không bốn card đồng dạng.
- CTA: không thêm CTA nếu final CTA nằm ngay sau.
- Desktop: hai cột label và explanation.
- Mobile: mỗi dòng xếp dọc.
- Component: `DifferentiationSection`.
- Dữ liệu thật: chỉ dùng capability đã có trong repo.
- Không được bịa: “cá nhân hóa bằng AI”, leaderboard, cộng đồng, giáo viên hoặc ngân hàng hàng nghìn đề.
- Cần thiết: có, nhưng phải ngắn.

## 7. Final CTA và footer

Final CTA:

- Headline: “Sẵn sàng bắt đầu một đề Toán?”
- CTA: dùng cùng label và intent với hero.
- Visual: khoảng trắng, một motif toán học tĩnh nhỏ; không dark section, gradient hoặc glow.
- Mobile: CTA rộng tối thiểu 44px chiều cao.

Footer:

- Logo, `/about`, `/dashboard`, GitHub hiện có.
- Không tạo Privacy hoặc Terms link rỗng.
- Legal links chỉ thêm khi có nội dung thật được phê duyệt.
- Không hiển thị version, build number, location, weather hoặc metrics.

# Hero Copywriting Options

## Các phương án headline

1. **Luyện đề Toán như một buổi thi thật.**
2. **Chọn đề, làm bài, biết phần nào cần ôn tiếp.**
3. **Một nơi để luyện đề Toán từ đầu đến lúc xem lại.**
4. **Tập trung làm đề, rõ ràng khi xem lại.**
5. **Mỗi đề thi cho bạn một hướng ôn tiếp.**
6. **Luyện đúng nhịp thi, xem rõ phần cần cải thiện.**

## Bộ copy được chọn

- Headline: **Luyện đề Toán như một buổi thi thật.**
- Subheadline: **Chọn đề, làm bài có bấm giờ, xem lại đáp án và biết chuyên đề nào cần ôn tiếp.**
- Primary CTA anonymous: **Bắt đầu luyện đề**
- Primary CTA logged-in: **Vào trang luyện tập**
- Secondary CTA: **Xem cách ManMath hoạt động**

Microcopy anonymous:

> Có thể làm đề ngay. Đăng nhập khi muốn lưu lịch sử và xem phân tích cá nhân.

Microcopy logged-in:

> Tiếp tục bài đang dở hoặc xem đề được gợi ý từ kết quả gần đây.

Lý do chọn:

- Nói rõ hành vi chính thay vì một lời hứa marketing.
- “Như một buổi thi thật” được hỗ trợ bởi timer, navigation và focus mode hiện có.
- Subheadline trình bày trọn product loop.
- Không hứa tăng điểm.
- Không làm ManMath giống trung tâm luyện thi hoặc AI startup.

# Mathematical Visual Options

| Hướng | Brand fit | Khác biệt | Hiệu năng | Accessibility | Responsive | Complexity | Maintenance | Rủi ro AI slop | MVP |
|---|---|---|---|---|---|---|---|---|---|
| Static 3D illustration | Trung bình | Trung bình | Tốt nếu ảnh tối ưu | Alt text đơn giản | Tốt | Trung bình | Trung bình | Cao nếu chỉ trang trí | Không ưu tiên |
| CSS/SVG mathematical composition | Cao | Cao nếu dùng hình học thật | Rất tốt | Có thể `aria-hidden` và mô tả bằng text | Rất tốt | Thấp đến trung bình | Thấp | Thấp | Có |
| Interactive SVG graph | Rất cao | Cao | Tốt đến trung bình | Cần fallback và keyboard model | Tốt | Trung bình đến cao | Trung bình | Thấp | Sau MVP |
| Three.js/WebGL geometry | Trung bình đến cao | Cao | Rủi ro cao trên mobile | Khó | Khó | Cao | Cao | Cao | Không |
| Product screenshot kết hợp toán học | Rất cao | Cao | Tốt với `next/image` | Alt text rõ | Tốt nếu có crop | Thấp | Cần cập nhật khi UI đổi | Thấp | Có |

## MVP an toàn

Kết hợp:

- Screenshot thật của màn làm đề.
- Hệ trục, đường cong hoặc hình chiếu toán học CSS/SVG tĩnh.
- Một primary indigo duy nhất.
- Không canvas, WebGL hoặc continuous pointer tracking.
- Không tái sử dụng trực tiếp các SVG question demo hiện tại trong hero vì chúng có nhiều màu semantic, copy không dấu và mang tính nội dung câu hỏi hơn là brand visual.

## Nâng cấp sau MVP

Ưu tiên interactive SVG graph trước Three.js:

- Pointer có thể thay đổi một điểm trên đồ thị.
- Keyboard controls tương đương.
- Fallback là cùng đồ thị ở trạng thái tĩnh.
- Chỉ tải client code khi visual vào gần viewport.
- Chỉ triển khai nếu Lighthouse và mobile profiling vẫn đạt budget.

Three.js chỉ được xem xét khi 3D geometry giúp giải thích một khái niệm thật, không dùng làm vật thể quay trang trí.

## Graceful degradation

- Mobile dưới 768px: bỏ grid chi tiết, giữ một đường cong và screenshot crop.
- `prefers-reduced-motion`: visual tĩnh hoàn toàn.
- Máy yếu: ảnh WebP/AVIF và SVG vẫn hiển thị, không có JS bắt buộc.
- Ảnh luôn có width/height hoặc aspect ratio để tránh CLS.
- Nếu screenshot lỗi, copy và CTA vẫn hoàn chỉnh.
- Visual trang trí dùng `aria-hidden`; screenshot sản phẩm có alt mô tả chức năng.

# Motion Strategy

| Hiệu ứng | Quyết định | Vị trí | Thời lượng | Tần suất/loop | Mobile | Reduced motion | Chi phí |
|---|---|---|---|---|---|---|---|
| Typewriter | Không dùng | Không có | Không áp dụng | Không loop | Không có | Không áp dụng | Loại bỏ JS, layout shift và distraction |
| Entrance animation | Có, rất nhẹ | Hero copy và visual | 180-240ms | Một lần khi load | Giảm offset còn 4px | Render ngay, không animation | Thấp |
| Parallax | Không dùng MVP | Không có | Không áp dụng | Không loop | Không có | Không áp dụng | Tránh scroll work |
| Hover interaction | Có | CTA, nav link, exam item | 150-200ms | Theo input | Chỉ active feedback | Không cần loại bỏ hoàn toàn | Rất thấp |
| Interactive 3D | Không dùng | Không có | Không áp dụng | Không loop | Không tải | Không tải | Không phát sinh bundle |
| Scroll animation | Không dùng mặc định | Không có pinned section | Không áp dụng | Không loop | Không có | Không áp dụng | Không cần observer/library |

Nguyên tắc:

- Chỉ animate `transform` và `opacity`.
- Không dùng `window.addEventListener('scroll')`.
- Không thêm Motion hoặc GSAP.
- Không animation tự lặp.
- Focus và active state được ưu tiên hơn animation trang trí.

# Design System Direction

## Token màu

| Token | Giá trị đề xuất | Dùng cho |
|---|---|---|
| Canvas | `#F7F8FC` | Nền landing và workspace |
| Surface | `#FFFFFF` | Panel có hierarchy thật |
| Surface subtle | `#EEF2F7` | Filter, skeleton, selected area |
| Text primary | `#0F172A` | Heading và body quan trọng |
| Text secondary | `#475569` | Body phụ |
| Text muted | `#64748B` | Metadata, không dùng cho body nhỏ dài |
| Border | `#DCE3EC` | Divider và control |
| Primary | `#4F46E5` | CTA, active nav, link |
| Primary hover | `#4338CA` | Hover/pressed |
| Primary tint | `#EEF2FF` | Selected state |
| Success | `#047857` | Kết quả đúng và trạng thái tốt |
| Warning | `#B45309` | Bài chưa hoàn thành, cần ôn |
| Error | `#B91C1C` | Submit/error state |

Teal hiện tại không tiếp tục là accent marketing. Màu semantic chỉ dùng khi dữ liệu có ý nghĩa tương ứng.

## Typography

MVP không thêm font hoặc build-time Google Fonts.

- Dùng system sans stack có hỗ trợ tiếng Việt.
- Loại bỏ việc gọi tên `Outfit` khi font chưa thực sự tồn tại.
- Display landing: 48/52px desktop, 36/40px mobile, 700.
- App H1: 32/38px, 700.
- Section H2: 24/30px, 650 hoặc 700.
- Body: 16/26px.
- Secondary body: 14/21px.
- Numeric: `tabular-nums`.
- Timer và question index có thể dùng system monospace.
- Body text giới hạn khoảng 60-68 ký tự mỗi dòng.

Brand font self-hosted là phase sau, chỉ khi có file WOFF2, license và Vietnamese subset thật.

## Spacing

Scale chung:

- 4, 8, 12, 16, 24, 32, 48, 64, 80, 96px.
- Landing section: 80px desktop, 56px mobile.
- Dashboard vertical groups: 24-32px.
- Form/control gap: 8-12px.
- Không dùng padding đối xứng máy móc nếu optical balance yêu cầu khác.

## Radius và surfaces

- 6px: chip nhỏ.
- 8px: input, button, compact item.
- 12px: dashboard panel.
- 16px: screenshot/media frame.
- Pill chỉ dành cho status hoặc số liệu nhỏ.
- Surface không mặc định có cả border và shadow.
- Shadow chỉ dùng cho sticky header, elevated media hoặc modal.
- Group dữ liệu bằng whitespace, `divide-y` hoặc một border nhóm thay vì card lồng card.

## Button hierarchy

- Primary: nền indigo, text trắng, 44-48px.
- Secondary: border neutral, nền surface.
- Tertiary: text link.
- Danger chỉ dùng cho hành động nguy hiểm thật.
- CTA label không wrap ở desktop.
- Primary CTA dùng cùng một label cho cùng intent trên toàn landing.

## Navigation states

- Active workspace nav: primary tint + primary text.
- Hover: surface subtle.
- Focus: outline 2px primary, offset 2px.
- Mobile nav giữ vùng chạm tối thiểu 44x44px.
- Không xóa global focus outline trừ khi component có focus ring thay thế đầy đủ.

## Icon và illustration

- Không thêm icon library trong MVP.
- Tái sử dụng icon hiện có, chuẩn hóa stroke 1.5-2px.
- Landing hạn chế icon, ưu tiên typography, screenshot và motif toán học.
- Illustration dùng hệ trục, đồ thị, vector và hình chiếu có logic toán học.
- Không blob, neon, glassmorphism hoặc gradient tím-xanh.

## Shared và surface-specific tokens

Dùng chung:

- Logo, primary, neutral palette, typography, focus ring, radius, button states.
- Copy tone ngắn, trực tiếp.
- Mathematical line motif.

Landing riêng:

- Display scale lớn hơn.
- Section spacing rộng hơn.
- Media frame và product screenshot.
- Ít border, ít panel.

Workspace riêng:

- Density cao hơn.
- Sticky app navigation.
- Search/filter controls.
- Semantic progress/status colors.

Focus exam riêng:

- Timer numeric style.
- Sticky exam header.
- Question and review states.
- Không thêm marketing copy hoặc decorative motion.

# Dashboard Improvement Plan

## Hierarchy mới

1. Header dashboard:
   - Logged-in: chào bằng tên thật nếu đã có dữ liệu.
   - Guest: “Chọn một đề để bắt đầu”.
2. Continue unfinished exam:
   - Chỉ xuất hiện khi có draft local.
   - Dùng prominence cao nhất vì đây là task dang dở.
3. Personal next action:
   - Logged-in có data: recommendation thật.
   - Logged-in chưa có data: hướng dẫn làm đề đầu tiên.
   - Guest: “Bắt đầu nhanh”, lấy ba exam đầu tiên nhưng không gọi là recommendation.
4. Search/filter:
   - Search luôn hiển thị.
   - Advanced filters collapse ở mobile và có thể collapse trên desktop nhỏ.
5. Exam library:
   - Ưu tiên danh sách scan nhanh.
   - Không bọc cả library trong card nặng.
6. Personal progress preview:
   - Chỉ logged-in.
   - Một summary ngắn và link analytics.
   - Không biến dashboard thành analytics page.

## Trạng thái theo người dùng

| Trạng thái | Nội dung |
|---|---|
| Anonymous | Draft local, bắt đầu nhanh, exam library, lời nhắc đăng nhập để lưu lịch sử |
| Logged-in có data | Draft, recommendation thật, progress preview, exam library |
| Logged-in chưa có data | Draft nếu có, onboarding một câu, exam library |
| Loading | Skeleton đúng hình dạng từng vùng, không spinner toàn trang |
| Recommendation lỗi | Hiển thị message cục bộ; library vẫn dùng được |
| Exam list lỗi initial | Error state toàn vùng với retry |
| Filter không có kết quả | Empty state và nút xóa filter |
| Topics API lỗi | Search và các filter còn lại vẫn hoạt động nếu có thể |

## Giảm card và border

- Continue banner có nền warning tint, không cần shadow.
- Recommendation dùng một panel duy nhất với các item phân tách bằng spacing.
- Exam library dùng heading, filter bar và list rows.
- Featured exam chỉ dùng 1-2 card nếu có lý do, không mặc định ba card ngang.
- Progress preview dùng text và numbers, không bốn metric cards.
- Loại bỏ nút bookmark chưa có behavior.

## Không thay đổi

- Query API hiện tại.
- Debounce filter.
- Autosave keys.
- Submit request/response.
- Result sessionStorage.
- Auth token.
- Practice flow.
- Các protected API.

# Responsive & Accessibility Plan

## Breakpoints

- Mobile: 320-767px.
- Tablet: 768-1023px.
- Desktop: 1024px trở lên.
- Large desktop container: tối đa khoảng 1280px.

## Landing responsive

- Hero copy trước visual trong DOM.
- H1 tối đa ba dòng mobile và hai dòng desktop.
- Không dùng `h-screen`.
- CTA full-width trên màn rất nhỏ.
- Product screenshot có crop mobile riêng hoặc `object-position` được kiểm thử.
- Section không phụ thuộc hover để hiểu nội dung.

## Dashboard responsive

- Sidebar desktop, bottom nav mobile như hiện tại.
- Search full-width.
- Filter nâng cao xếp hai cột trên tablet, một hoặc hai cột mobile tùy chiều rộng.
- Exam row chuyển thành vertical stack trên mobile.
- Draft CTA không ép cạnh text khi thiếu chiều rộng.
- Mobile bottom padding bao gồm safe-area.

## Keyboard và screen reader

- Thêm skip link tới `main`.
- Landmarks: một `header`, `nav`, `main`, `footer` đúng vai trò.
- Focus order: header, hero copy, CTA, visual link nếu có, sections.
- Khôi phục global focus-visible.
- Avatar-only link có `aria-label`.
- Chip remove có vùng chạm tối thiểu 44px hoặc padding hit-area.
- Decorative mathematical visual dùng `aria-hidden`.
- Screenshot có alt mô tả chức năng, không ghi “image”.
- Không tự focus hoặc tự scroll khi landing load.

## Contrast

- Body text đạt WCAG AA 4.5:1.
- Large heading và icon semantic tối thiểu 3:1.
- Placeholder không thay label.
- Focus ring không chỉ dựa vào thay đổi màu.
- Warning text không dùng opacity thấp trên warning tint.

## Reduced motion

- Giữ media query hiện tại.
- Entrance animation bỏ hoàn toàn khi reduce.
- Không smooth-scroll bắt buộc.
- Future interactive graph phải có static fallback tương đương.

# Performance Plan

## Client boundary

Landing mặc định là Server Components.

Client-only:

- `LandingAuthActions` đọc token và subscribe token change.
- Không gọi `/api/auth/me` chỉ để đổi CTA.
- Không mount `GoogleOAuthProvider` trên landing.
- Không đưa scroll listener hoặc animation library vào client bundle.

Workspace:

- Giữ các client component hiện tại vì search/filter/auth phụ thuộc browser.
- Recommendation và progress chỉ fetch khi có token.
- Failure của personal module không block exam list.

## Assets

- Hero screenshot dùng `next/image`, có priority.
- Ảnh dưới fold lazy load.
- Hero WebP/AVIF mục tiêu tối đa 180KB.
- Mỗi screenshot dưới fold tối đa 160KB.
- Width/height cố định.
- `sizes` khớp bố cục desktop/mobile.
- Không preload analytics screenshot.
- Không video autoplay.

## CSS và KaTeX

- Chuyển `katex.min.css` khỏi root public bundle vào focus layout.
- Landing visual không dùng KaTeX runtime.
- Không thêm Three.js, Motion, GSAP hoặc icon package.
- Audit Tailwind output sau khi route groups hoàn tất.

## Performance budget

- LCP p75 mobile: dưới 2.5 giây.
- INP p75: dưới 200ms.
- CLS: dưới 0.1.
- Landing route-specific JS: dưới 25KB gzip.
- Tổng initial JS landing, kể cả framework: mục tiêu dưới 140KB gzip.
- CSS landing: dưới 35KB gzip.
- Initial transferred resources: dưới 450KB trên first load.
- Tổng ảnh trong initial viewport: dưới 250KB.
- DOM landing: dưới 900 nodes.
- Không long task trên 50ms do code landing.
- Không canvas/WebGL trong MVP.

## Memory

- Static SVG và optimized images không cần lifecycle.
- Không giữ ảnh full-resolution lớn hơn kích thước render cần thiết.
- Future WebGL phải pause khi tab hidden và dispose renderer, geometry, material khi unmount.
- Không thêm watcher hoặc animation runtime làm tăng bộ nhớ development.

## Verification

- Production build.
- Lighthouse mobile với cold cache.
- Test mạng Fast 3G hoặc Slow 4G.
- Test landing khi backend tắt.
- Kiểm tra bundle trước và sau bằng build artifacts.
- Test ảnh disabled hoặc request ảnh thất bại.

# Prioritized Implementation Roadmap

## Phase 0: Route and layout preparation

- Mục tiêu: tách public, workspace và focus layouts; thêm `/dashboard`.
- Lý do: giải quyết coupling root trước khi làm visual.
- Ảnh hưởng: root layout, app routes, `AppSidebar`, `AppHeader`, các link quay về `/`.
- File mới: route group layouts và dashboard page.
- Dependency: không.
- Complexity: High.
- Risk: sai import relative, mất shell, back link trỏ sai, `/exams` duplicate.
- Hoàn thành khi:
  - `/` không có app shell.
  - `/dashboard` có sidebar/header.
  - `/exams` redirect.
  - Focus routes không có app shell.
  - Tất cả route cũ vẫn mở được.
- Test: build, type-check, route matrix, focus back links, auth states.
- Rollback: revert riêng commit route migration. Không có database rollback.

## Phase 1: Landing skeleton và shared tokens

- Mục tiêu: tạo public header, page sections rỗng có semantic structure, public footer và metadata.
- Lý do: khóa hierarchy trước visual.
- Ảnh hưởng: landing page, globals, root metadata.
- File mới: marketing components cơ bản.
- Dependency: không.
- Complexity: Medium.
- Risk: token đổi làm regress dashboard.
- Hoàn thành khi landing responsive hoạt động với text-only skeleton và workspace không đổi behavior.
- Test: 320, 375, 768, 1024, 1440px; keyboard; contrast.
- Rollback: revert token/layout commit.

## Phase 2: Hero và mathematical visual

- Mục tiêu: triển khai copy được chọn, auth-aware CTA, screenshot thật và mathematical composition.
- Lý do: tạo first impression và brand identity.
- File mới: `HeroSection`, `LandingAuthActions`, `MathProductVisual`, hero asset.
- Dependency: không.
- Complexity: Medium.
- Risk: screenshot nặng, CTA shift sau hydration, visual giống trang trí.
- Hoàn thành khi CTA hiển thị trong viewport đầu, landing hoạt động khi JS hoặc backend chậm, asset đạt budget.
- Test: auth/no-auth, reduced motion, image failure, mobile crop.
- Rollback: thay hero visual bằng ảnh tĩnh duy nhất.

## Phase 3: Product proof sections

- Mục tiêu: thêm vòng luyện tập, exam preview, result insight và differentiation.
- Lý do: chứng minh capability thật.
- File mới: bốn section components và hai product screenshots.
- Dependency: không.
- Complexity: Medium.
- Risk: trang dài, lặp layout, data demo bị hiểu là metric.
- Hoàn thành khi mỗi section có mục tiêu riêng và không có fake data.
- Test: content audit, screen reader landmarks, screenshot alt, mobile order.
- Rollback: loại từng section độc lập.

## Phase 4: Dashboard migration và redesign

- Mục tiêu: chuyển exam list thành workspace exam-first có hierarchy mới.
- Lý do: landing tốt nhưng dashboard cũ sẽ tạo cảm giác hai sản phẩm khác nhau.
- Ảnh hưởng: `ExamListClient`, `ExamList`, `ExamCard`, recommendation/progress components.
- Dependency: không.
- Complexity: High.
- Risk: filter regress, recommendation mislabeled, draft bị ẩn, personal request block library.
- Hoàn thành khi:
  - Guest có quick start và library.
  - Logged-in có recommendation thật.
  - Draft được ưu tiên.
  - Filter contract không đổi.
  - Bookmark giả được bỏ.
- Test: anonymous/logged-in, có/không data, filter combinations, API partial failure, draft reload.
- Rollback: giữ `/dashboard` nhưng render lại `ExamListClient` presentation cũ.

## Phase 5: Responsive và accessibility

- Mục tiêu: hoàn thiện keyboard, focus, landmarks, contrast và mobile navigation.
- Lý do: xử lý các regress hiện tại và readiness production.
- Dependency: không.
- Complexity: Medium.
- Risk: global focus CSS ảnh hưởng modal/exam controls.
- Hoàn thành khi tab order rõ, không mất focus, hit area đạt 44px và zoom 200% dùng được.
- Test: keyboard-only, reduced motion, screen reader smoke test, 200% zoom.
- Rollback: revert từng nhóm CSS/ARIA nhỏ, không revert toàn redesign.

## Phase 6: Performance và polish

- Mục tiêu: scope KaTeX CSS, tối ưu ảnh, kiểm tra bundle và Lighthouse.
- Lý do: landing không được trả chi phí của exam runtime.
- Dependency: không.
- Complexity: Medium.
- Risk: KaTeX style không load ở một review route, ảnh crop sai.
- Hoàn thành khi build pass, mọi math route render đúng và performance budget đạt.
- Test: production build, all focus routes, Lighthouse, cold-cache network.
- Rollback: đưa KaTeX CSS về root nếu route scoping gây lỗi, giữ các tối ưu ảnh khác.

# Risks and Safeguards

| Rủi ro | Safeguard |
|---|---|
| Hard-coded `/` đưa user về landing thay vì kho đề | Lập bảng link intent và test từng focus route |
| `/dashboard` bị auth-gate ngoài ý muốn | Ghi rõ guest mode là acceptance criterion |
| Route groups làm sai import | Phase 0 chỉ làm route/layout, build ngay trước visual work |
| Dirty worktree bị ghi đè | Kiểm tra diff từng file, commit redesign theo phase, không reset |
| Recommendation giả | Chỉ gọi recommendation khi dữ liệu đến từ API cá nhân |
| Landing và dashboard khác brand | Dùng chung color, typography, radius, logo, buttons và math motif |
| Screenshot nhanh lỗi thời | Chụp từ seeded route, ghi nguồn, cập nhật khi UI chính thay đổi |
| Screenshot chứa số demo gây hiểu nhầm | Caption rõ là ví dụ từ lượt làm thử, không dùng số làm claim |
| Auth CTA gây hydration shift | Initial markup ổn định, reserve width, chỉ đổi copy sau mount |
| Landing mang Google OAuth và KaTeX bundle | Tách provider và KaTeX ra khỏi public layout |
| Motion làm mỏi mắt | Motion intensity 3, không loop, không parallax/typewriter |
| Three.js làm chậm mobile | Cấm trong MVP; cần approval và profiling riêng nếu đề xuất lại |
| Focus visibility regress | Không blanket-remove outline; audit từng control |
| SEO duplicate `/exams` | Server redirect tới `/dashboard` |
| Canonical/OG domain giả | Không cấu hình absolute URL đến khi có domain thật |
| Legal footer link chết | Không tạo link cho đến khi có nội dung pháp lý thật |

# Implementation Handoff for Coding Model

## Quyết định sản phẩm

- `/` là landing công khai.
- `/dashboard` là exam workspace hỗ trợ guest và logged-in.
- `/exams` redirect tạm thời tới `/dashboard`.
- Landing luôn hiển thị, không auto-redirect user đã login.
- Không đổi backend, API, database, auth model, autosave hoặc submit flow.
- Không thêm dependency.
- Không thêm dark mode trong phase này.
- Không dùng typewriter, parallax, scroll hijack, WebGL hoặc 3D.

## Component tree dự kiến

```text
RootLayout
├── ErrorBoundary
├── PublicLayout
│   ├── PublicHeader
│   ├── LandingPage
│   │   ├── HeroSection
│   │   │   ├── LandingAuthActions [client island]
│   │   │   └── MathProductVisual
│   │   ├── PracticeLoopSection
│   │   ├── ExamExperienceSection
│   │   ├── LearningInsightSection
│   │   ├── DifferentiationSection
│   │   └── FinalCtaSection
│   └── PublicFooter
├── WorkspaceLayout
│   ├── AuthProvider
│   ├── AppSidebar
│   ├── AppHeader
│   └── DashboardPage
│       └── ExamListClient
│           ├── ContinueExamBanner
│           ├── PersonalNextAction
│           ├── ExamFilterBar
│           └── ExamLibrary
└── FocusLayout
    ├── ExamTakingClient
    ├── ExamResultClient
    ├── AttemptDetailClient
    └── PracticeClient
```

## File cần tạo hoặc di chuyển

Route/layout:

- `frontend/src/app/(public)/layout.tsx`
- `frontend/src/app/(public)/page.tsx`
- `frontend/src/app/(public)/about/page.tsx`
- `frontend/src/app/(workspace)/layout.tsx`
- `frontend/src/app/(workspace)/dashboard/page.tsx`
- `frontend/src/app/(workspace)/exams/page.tsx`
- Chuyển analytics, history và profile vào `(workspace)`.
- `frontend/src/app/(focus)/layout.tsx`
- Chuyển exam, attempts và practice vào `(focus)` mà không đổi URL.

Marketing components:

- `frontend/src/components/marketing/PublicHeader.tsx`
- `frontend/src/components/marketing/HeroSection.tsx`
- `frontend/src/components/marketing/LandingAuthActions.tsx`
- `frontend/src/components/marketing/MathProductVisual.tsx`
- `frontend/src/components/marketing/PracticeLoopSection.tsx`
- `frontend/src/components/marketing/ExamExperienceSection.tsx`
- `frontend/src/components/marketing/LearningInsightSection.tsx`
- `frontend/src/components/marketing/DifferentiationSection.tsx`
- `frontend/src/components/marketing/FinalCtaSection.tsx`
- `frontend/src/components/marketing/PublicFooter.tsx`

Assets:

- `frontend/public/images/landing/exam-workspace.webp`
- `frontend/public/images/landing/result-review.webp`
- `frontend/public/images/landing/analytics-preview.webp`

## File cần sửa

- `frontend/src/app/layout.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/components/layout/AppSidebar.tsx`
- `frontend/src/components/layout/AppHeader.tsx`
- `frontend/src/components/exam/ExamListClient.tsx`
- `frontend/src/components/exam/ExamList.tsx`
- `frontend/src/components/exam/ExamCard.tsx`
- `frontend/src/components/exam/RecommendationCard.tsx`
- `frontend/src/components/exam/UserTopicStatsCard.tsx`
- `frontend/src/components/exam/ExamHeader.tsx`
- `frontend/src/components/exam/ExamTakingClient.tsx`
- `frontend/src/components/exam/ExamResultClient.tsx`
- `frontend/src/components/exam/ExamAttemptsClient.tsx`
- `frontend/src/components/exam/AttemptDetailClient.tsx`
- `frontend/src/components/practice/PracticeClient.tsx`
- `frontend/src/components/analytics/AnalyticsClient.tsx`
- `frontend/src/components/history/HistoryClient.tsx`
- `frontend/src/components/profile/ProfileClient.tsx`
- `frontend/src/components/auth/AuthButton.tsx`
- Các UI primitives nếu cần đồng bộ token/focus.

## Thứ tự task bắt buộc

1. Route groups và `/dashboard`.
2. Audit toàn bộ link intent.
3. Build và smoke test exam flow.
4. Public tokens và landing skeleton.
5. Hero/copy/static visual.
6. Product proof screenshots và sections.
7. Dashboard hierarchy.
8. Accessibility/responsive.
9. KaTeX scoping, image optimization và Lighthouse.
10. Documentation update sau khi behavior đã ổn định.

## Điều cấm

- Không sửa backend.
- Không thay API DTO.
- Không đổi storage key.
- Không auth-gate `/dashboard`.
- Không gọi ba exam đầu tiên là recommendation.
- Không tạo fake metric, testimonial hoặc logo wall.
- Không dựng fake screenshot bằng div.
- Không thêm dependency.
- Không thêm Google Font build-time.
- Không thêm bookmark behavior ngoài scope.
- Không thêm AI copy hoặc claim.
- Không triển khai 3D.
- Không refactor exam-taking logic trong redesign.
- Không xóa hoặc reset thay đổi hiện có trong worktree.

## Acceptance criteria

- `/` giải thích rõ ManMath mà không cần backend hoặc login.
- `/dashboard` giữ toàn bộ search/filter và exam-taking entry.
- Guest vẫn có thể làm đề.
- Logged-in vẫn lưu attempt và xem history/analytics.
- `/exams` không trả 404.
- Back link từ exam/result/attempt/practice về đúng workspace.
- Autosave và restore sau reload không đổi.
- Submit vẫn tới `/exam/[id]/result`.
- Focus mode không có app sidebar/header.
- Landing không load Google OAuth UI, KaTeX runtime hoặc animation library.
- Không có CTA giả, metric giả, testimonial giả hoặc dead link.
- Keyboard focus luôn nhìn thấy.
- Reduced motion được tôn trọng.
- Type-check và production build pass.
- Core Web Vitals và performance budget đạt mục tiêu.

## Testing checklist

- `npm run type-check`
- `npm run build`
- `/` anonymous và logged-in
- `/dashboard` anonymous
- `/dashboard` logged-in có data
- `/dashboard` logged-in chưa có data
- `/exams` redirect
- Search/filter đầy đủ
- Draft autosave và continue
- Submit, result, review
- Exam attempts và attempt detail
- Practice topic focus mode
- Analytics/history/profile unauthorized và authorized
- Backend offline trên landing
- 320px, 375px, 768px, 1024px, 1440px
- Keyboard-only
- Reduced motion
- 200% zoom
- Lighthouse mobile
- Kiểm tra ảnh, alt text, CLS và network waterfall

# Open Decisions Requiring My Approval

Các default đã được chốt trong kế hoạch, nhưng phải được chủ dự án phê duyệt trước khi code:

1. Chấp nhận `/dashboard` là workspace hỗ trợ cả guest, thay vì route auth-gated.
2. Chấp nhận `/exams` redirect tạm thời tới `/dashboard`.
3. Chấp nhận bộ hero copy đã chọn.
4. Chấp nhận visual MVP là screenshot thật + CSS/SVG toán học, không typewriter hoặc 3D.
5. Chấp nhận giữ system font trong MVP và không thêm dependency/font tải từ Google.
6. Chấp nhận route-group refactor ảnh hưởng hơn 5 file.
7. Domain production và legal copy chưa có sẽ không được tự bịa hoặc tự thêm.
8. Khi chuyển sang triển khai, chọn:
   - A. Guided implementation, mặc định và được khuyến nghị cho learning project.
   - B. Full implementation.
