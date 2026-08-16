# Hệ thống thiết kế giao diện

## Nguyên tắc hiện tại — Tối giản và tập trung

ManMath ưu tiên cảm giác học tập tập trung, học thuật và ít mệt mỏi. Giao diện phải giúp người học hiểu việc cần làm tiếp theo thay vì mô phỏng một bảng điều khiển dữ liệu hoặc sản phẩm AI chung chung.

## Các không gian giao diện

- **Công khai:** trang giới thiệu nhẹ, giải thích luồng bằng nội dung và hình ảnh thật của sản phẩm.
- **Không gian làm việc:** bảng điều khiển, phân tích, lịch sử và hồ sơ; mật độ vừa phải, dễ quét và điều hướng ổn định.
- **Tập trung:** làm bài, kết quả/xem lại, xem trước bản nháp và luyện tập; không hiển thị khung không gian làm việc.

## Màu sắc

| Vai trò | Mã/giá trị |
| --- | --- |
| Chính | `#3B82F6` |
| Chính khi rê chuột | `#2563EB` |
| Nền | `#F8FAFC` |
| Bề mặt | `#FFFFFF` |
| Chữ chính | `#0F172A` |
| Chữ phụ | `#64748B` |
| Viền | `#E2E8F0` |
| Thành công | `#10B981` |
| Cảnh báo | `#F59E0B` |
| Nguy hiểm | `#EF4444` |

Màu xanh dương là màu nhấn chung. Các màu thành công/cảnh báo/nguy hiểm biểu thị trạng thái có ý nghĩa; tránh màu neon, dải màu tím trang trí và phong cách bảng điều khiển AI chung chung.

## Kiểu chữ và mật độ

- Không gian làm việc dùng Inter hoặc bộ font hệ thống tương đương trong `.workspace-shell`.
- Ưu tiên độ đậm 400–700; siêu dữ liệu phải dễ đọc, còn điểm/đồng hồ/số lượng dùng chữ số có độ rộng cố định.
- Màn hình tập trung ưu tiên khả năng đọc câu hỏi dài và KaTeX.
- Dùng nhất quán quy tắc khung nội dung/khoảng lề và phân cấp section có ý nghĩa, thay vì biến mọi khối thành thẻ lớn.

## Bề mặt và thành phần

- Dùng viền mảnh, độ bo vừa phải và chỉ dùng bóng khi cần tạo phân cấp.
- Nội dung học tập lặp lại nên dùng hàng/đường phân cách thay vì thẻ quá lớn.
- Mỗi vùng chỉ nên có một hành động chính nổi bật; hành động phụ dùng kiểu viền hoặc văn bản.
- Trạng thái trống phải phân biệt rõ chưa có dữ liệu, chưa đăng nhập và chưa có đề xuất phù hợp.
- Trạng thái xem lại dùng màu có ý nghĩa kết hợp văn bản/biểu tượng, không chỉ dựa vào màu.

## Khả năng tiếp cận và thích ứng màn hình

- Duy trì liên kết bỏ qua nội dung, trạng thái được chọn bằng bàn phím rõ ràng và vùng chạm đủ dùng.
- SVG trang trí dùng `aria-hidden`; ảnh mang thông tin phải có văn bản thay thế có ý nghĩa.
- Tôn trọng `prefers-reduced-motion`; người dùng vẫn phải hiểu đầy đủ nội dung khi không có chuyển động.
- Trên di động, đặt nội dung cần đọc trước hình ảnh hỗ trợ và tránh tràn ngang.
- KaTeX, bảng đúng/sai và điều hướng câu hỏi phải tiếp tục dễ đọc trên màn hình hẹp.

## Hướng dẫn chuyển động

Trang giới thiệu hiện có hiệu ứng tiêu đề hiện chữ nhẹ và chuyển động SVG tạo trực tiếp bằng mã. Với người dùng bật giảm chuyển động, nội dung phải trở về trạng thái hiển thị đầy đủ. Không thêm thư viện hoạt ảnh tổng quát, hiệu ứng thị sai, chuyển động lặp để thu hút chú ý hoặc hiệu ứng cạnh tranh với việc làm bài.

## Những điều cần tránh

- Hiệu ứng kính mờ, khối trang trí ngẫu nhiên, màu neon hoặc mô-típ bảng điều khiển AI.
- Số người học, lời chứng thực, ảnh đại diện, điểm số hoặc đề xuất giả.
- Dựng lại ảnh chụp sản phẩm bằng HTML gây hiểu nhầm hoặc trình bày dữ liệu mô phỏng như dữ liệu người dùng thật.
- Thay đổi giao diện làm đổi hành vi chấm điểm, lưu dữ liệu, xác thực hoặc tuyến chỉ để đơn giản hóa mã trình bày.

## Lý do thiết kế

Việc tách không gian công khai/làm việc/tập trung là có chủ đích: giới thiệu sản phẩm, quản lý quá trình học và làm bài có giới hạn thời gian đòi hỏi mức độ chú ý khác nhau. Màu trạng thái có ý nghĩa và điều hướng gọn giúp giảm chi phí rà soát sau khi nộp, trong khi máy chủ vẫn là nguồn sự thật cho kết quả chấm điểm.
