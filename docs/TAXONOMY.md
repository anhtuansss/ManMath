# Taxonomy Toán canonical

Nguồn sự thật cho taxonomy đang vận hành là `backend/src/data/canonicalTaxonomy.ts`. Database phải có đúng 12 topic và 82 subtopic dưới đây.

File JSON chỉ khai báo tập con topic/subtopic mà đề dùng. Mỗi slug, tên hiển thị và quan hệ cha-con phải khớp chính xác catalog canonical; importer không tự tạo taxonomy từ JSON.

## Topic và subtopic

1. `ham-so-va-do-thi-nen-tang` — Hàm số và Đồ thị nền tảng
   - `ham-so-va-tap-xac-dinh`
   - `tinh-chat-va-do-thi-cac-ham-so-co-ban`
   - `ham-so-bac-hai-va-parabol`
   - `tuong-giao-do-thi`
   - `bai-toan-thuc-te-su-dung-ham-so-va-do-thi`
2. `dao-ham-va-khao-sat-ham-so` — Đạo hàm và Khảo sát hàm số
   - `dao-ham-va-cac-quy-tac-tinh-dao-ham`
   - `tiep-tuyen-cua-do-thi-ham-so`
   - `tinh-don-dieu-cua-ham-so`
   - `cuc-tri-cua-ham-so`
   - `gia-tri-lon-nhat-gia-tri-nho-nhat`
   - `duong-tiem-can`
   - `khao-sat-va-nhan-dang-do-thi-ham-so`
   - `bai-toan-tham-so-don-dieu-cuc-tri-tuong-giao`
   - `ung-dung-dao-ham-va-bai-toan-toi-uu`
3. `luy-thua-mu-va-logarit` — Lũy thừa, Mũ và Logarit
   - `luy-thua-va-bien-doi-bieu-thuc`
   - `logarit-va-cac-tinh-chat`
   - `ham-so-mu`
   - `ham-so-logarit`
   - `phuong-trinh-mu`
   - `phuong-trinh-logarit`
   - `bat-phuong-trinh-mu-va-logarit`
   - `bai-toan-thuc-te-lai-suat-tang-truong-phan-ra`
4. `nguyen-ham-tich-phan-va-ung-dung` — Nguyên hàm, Tích phân và Ứng dụng
   - `nguyen-ham-co-ban`
   - `phuong-phap-tinh-nguyen-ham`
   - `tich-phan-va-tinh-chat`
   - `phuong-phap-tinh-tich-phan`
   - `dien-tich-hinh-phang`
   - `the-tich-vat-the-va-khoi-tron-xoay-bang-tich-phan`
   - `ung-dung-tich-phan-trong-bai-toan-thuc-te`
5. `hinh-hoc-khong-gian` — Hình học không gian
   - `quan-he-song-song-trong-khong-gian`
   - `quan-he-vuong-goc-trong-khong-gian`
   - `phep-chieu-song-song-va-phep-chieu-vuong-goc`
   - `goc-trong-khong-gian`
   - `khoang-cach-trong-khong-gian`
   - `the-tich-khoi-chop`
   - `the-tich-khoi-lang-tru`
   - `bai-toan-hinh-hoc-khong-gian-tong-hop`
6. `khoi-tron-xoay` — Khối tròn xoay
   - `mat-non-va-khoi-non`
   - `mat-tru-va-khoi-tru`
   - `mat-cau-va-khoi-cau`
   - `noi-tiep-ngoai-tiep-va-bai-toan-tong-hop-non-tru-cau`
7. `vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz` — Vectơ và Phương pháp tọa độ trong không gian Oxyz
   - `vecto-trong-khong-gian`
   - `he-toa-do-oxyz-va-toa-do-diem`
   - `phuong-trinh-mat-phang`
   - `phuong-trinh-duong-thang`
   - `phuong-trinh-mat-cau`
   - `vi-tri-tuong-doi`
   - `goc-trong-oxyz`
   - `khoang-cach-trong-oxyz`
   - `bai-toan-oxyz-tong-hop-va-thuc-te`
8. `xac-suat-va-to-hop` — Xác suất và Tổ hợp
   - `quy-tac-dem`
   - `hoan-vi-chinh-hop-to-hop`
   - `nhi-thuc-newton`
   - `xac-suat-co-dien`
   - `cac-quy-tac-tinh-xac-suat`
   - `xac-suat-co-dieu-kien`
   - `xac-suat-toan-phan-va-bayes`
   - `bien-co-doc-lap`
9. `thong-ke` — Thống kê
   - `mau-so-lieu-khong-ghep-nhom`
   - `mau-so-lieu-ghep-nhom`
   - `so-dac-trung-do-xu-the-trung-tam`
   - `tu-phan-vi`
   - `cac-so-dac-trung-do-muc-do-phan-tan`
   - `doc-phan-tich-va-ket-luan-tu-so-lieu`
10. `luong-giac` — Lượng giác
    - `gia-tri-luong-giac`
    - `cong-thuc-luong-giac`
    - `ham-so-luong-giac`
    - `phuong-trinh-luong-giac-co-ban`
    - `phuong-trinh-luong-giac-tong-hop`
    - `bai-toan-thuc-te-su-dung-luong-giac`
11. `day-so-va-cap-so` — Dãy số và Cấp số
    - `day-so-va-quy-luat-day-so`
    - `day-so-tang-giam-bi-chan`
    - `cap-so-cong`
    - `cap-so-nhan`
    - `tong-cac-so-hang-cua-cap-so`
    - `bai-toan-thuc-te-su-dung-day-so-va-cap-so`
12. `chuyen-de-hoc-tap-va-toan-ung-dung` — Chuyên đề học tập và Toán ứng dụng
    - `ly-thuyet-do-thi-co-ban`
    - `duong-di-euler-va-hamilton`
    - `bai-toan-duong-di-toi-uu`
    - `bai-toan-toi-uu-bang-mo-hinh-toan-hoc`
    - `bai-toan-toi-uu-tuyen-tinh-va-bat-phuong-trinh`
    - `bai-toan-thuc-te-tong-hop`

## Quy tắc vận hành

- Chỉ dùng slug trong catalog này ở `topicSlug` và `subtopicSlug`.
- Subtopic phải thuộc đúng topic cha trong danh sách.
- Nội dung đã publish không được sửa để đổi taxonomy. Hãy import draft version mới rồi publish.
- Attempt và snapshot lịch sử giữ nguyên taxonomy tại lúc nộp. Analytics remap riêng các facts của version lịch sử sang taxonomy canonical, không ghi lại dữ liệu lịch sử.
- Chạy `npm run sync:canonical-taxonomy` để kiểm tra catalog DB và thêm `-- --write` để đồng bộ có chủ đích.
