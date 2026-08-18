export type CanonicalTopic = {
  readonly name: string;
  readonly slug: string;
  readonly order: number;
};

export type CanonicalSubtopic = {
  readonly name: string;
  readonly slug: string;
  readonly topicSlug: string;
};

export const CANONICAL_TOPICS: readonly CanonicalTopic[] = [
  { name: 'Hàm số và Đồ thị nền tảng', slug: 'ham-so-va-do-thi-nen-tang', order: 1 },
  { name: 'Đạo hàm và Khảo sát hàm số', slug: 'dao-ham-va-khao-sat-ham-so', order: 2 },
  { name: 'Lũy thừa, Mũ và Logarit', slug: 'luy-thua-mu-va-logarit', order: 3 },
  { name: 'Nguyên hàm, Tích phân và Ứng dụng', slug: 'nguyen-ham-tich-phan-va-ung-dung', order: 4 },
  { name: 'Hình học không gian', slug: 'hinh-hoc-khong-gian', order: 5 },
  { name: 'Khối tròn xoay', slug: 'khoi-tron-xoay', order: 6 },
  { name: 'Vectơ và Phương pháp tọa độ trong không gian Oxyz', slug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz', order: 7 },
  { name: 'Xác suất và Tổ hợp', slug: 'xac-suat-va-to-hop', order: 8 },
  { name: 'Thống kê', slug: 'thong-ke', order: 9 },
  { name: 'Lượng giác', slug: 'luong-giac', order: 10 },
  { name: 'Dãy số và Cấp số', slug: 'day-so-va-cap-so', order: 11 },
  { name: 'Chuyên đề học tập và Toán ứng dụng', slug: 'chuyen-de-hoc-tap-va-toan-ung-dung', order: 12 },
];

export const CANONICAL_SUBTOPICS: readonly CanonicalSubtopic[] = [
  { name: 'Hàm số và tập xác định', slug: 'ham-so-va-tap-xac-dinh', topicSlug: 'ham-so-va-do-thi-nen-tang' },
  { name: 'Tính chất và đồ thị các hàm số cơ bản', slug: 'tinh-chat-va-do-thi-cac-ham-so-co-ban', topicSlug: 'ham-so-va-do-thi-nen-tang' },
  { name: 'Hàm số bậc hai và parabol', slug: 'ham-so-bac-hai-va-parabol', topicSlug: 'ham-so-va-do-thi-nen-tang' },
  { name: 'Tương giao đồ thị', slug: 'tuong-giao-do-thi', topicSlug: 'ham-so-va-do-thi-nen-tang' },
  { name: 'Bài toán thực tế sử dụng hàm số và đồ thị', slug: 'bai-toan-thuc-te-su-dung-ham-so-va-do-thi', topicSlug: 'ham-so-va-do-thi-nen-tang' },
  { name: 'Đạo hàm và các quy tắc tính đạo hàm', slug: 'dao-ham-va-cac-quy-tac-tinh-dao-ham', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Tiếp tuyến của đồ thị hàm số', slug: 'tiep-tuyen-cua-do-thi-ham-so', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Tính đơn điệu của hàm số', slug: 'tinh-don-dieu-cua-ham-so', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Cực trị của hàm số', slug: 'cuc-tri-cua-ham-so', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Giá trị lớn nhất, giá trị nhỏ nhất', slug: 'gia-tri-lon-nhat-gia-tri-nho-nhat', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Đường tiệm cận', slug: 'duong-tiem-can', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Khảo sát và nhận dạng đồ thị hàm số', slug: 'khao-sat-va-nhan-dang-do-thi-ham-so', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Bài toán tham số, đơn điệu, cực trị, tương giao', slug: 'bai-toan-tham-so-don-dieu-cuc-tri-tuong-giao', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Ứng dụng đạo hàm và bài toán tối ưu', slug: 'ung-dung-dao-ham-va-bai-toan-toi-uu', topicSlug: 'dao-ham-va-khao-sat-ham-so' },
  { name: 'Lũy thừa và biến đổi biểu thức', slug: 'luy-thua-va-bien-doi-bieu-thuc', topicSlug: 'luy-thua-mu-va-logarit' },
  { name: 'Logarit và các tính chất', slug: 'logarit-va-cac-tinh-chat', topicSlug: 'luy-thua-mu-va-logarit' },
  { name: 'Hàm số mũ', slug: 'ham-so-mu', topicSlug: 'luy-thua-mu-va-logarit' },
  { name: 'Hàm số logarit', slug: 'ham-so-logarit', topicSlug: 'luy-thua-mu-va-logarit' },
  { name: 'Phương trình mũ', slug: 'phuong-trinh-mu', topicSlug: 'luy-thua-mu-va-logarit' },
  { name: 'Phương trình logarit', slug: 'phuong-trinh-logarit', topicSlug: 'luy-thua-mu-va-logarit' },
  { name: 'Bất phương trình mũ và logarit', slug: 'bat-phuong-trinh-mu-va-logarit', topicSlug: 'luy-thua-mu-va-logarit' },
  { name: 'Bài toán thực tế lãi suất, tăng trưởng, phân rã', slug: 'bai-toan-thuc-te-lai-suat-tang-truong-phan-ra', topicSlug: 'luy-thua-mu-va-logarit' },
  { name: 'Nguyên hàm cơ bản', slug: 'nguyen-ham-co-ban', topicSlug: 'nguyen-ham-tich-phan-va-ung-dung' },
  { name: 'Phương pháp tính nguyên hàm', slug: 'phuong-phap-tinh-nguyen-ham', topicSlug: 'nguyen-ham-tich-phan-va-ung-dung' },
  { name: 'Tích phân và tính chất', slug: 'tich-phan-va-tinh-chat', topicSlug: 'nguyen-ham-tich-phan-va-ung-dung' },
  { name: 'Phương pháp tính tích phân', slug: 'phuong-phap-tinh-tich-phan', topicSlug: 'nguyen-ham-tich-phan-va-ung-dung' },
  { name: 'Diện tích hình phẳng', slug: 'dien-tich-hinh-phang', topicSlug: 'nguyen-ham-tich-phan-va-ung-dung' },
  { name: 'Thể tích vật thể và khối tròn xoay bằng tích phân', slug: 'the-tich-vat-the-va-khoi-tron-xoay-bang-tich-phan', topicSlug: 'nguyen-ham-tich-phan-va-ung-dung' },
  { name: 'Ứng dụng tích phân trong bài toán thực tế', slug: 'ung-dung-tich-phan-trong-bai-toan-thuc-te', topicSlug: 'nguyen-ham-tich-phan-va-ung-dung' },
  { name: 'Quan hệ song song trong không gian', slug: 'quan-he-song-song-trong-khong-gian', topicSlug: 'hinh-hoc-khong-gian' },
  { name: 'Quan hệ vuông góc trong không gian', slug: 'quan-he-vuong-goc-trong-khong-gian', topicSlug: 'hinh-hoc-khong-gian' },
  { name: 'Phép chiếu song song và phép chiếu vuông góc', slug: 'phep-chieu-song-song-va-phep-chieu-vuong-goc', topicSlug: 'hinh-hoc-khong-gian' },
  { name: 'Góc trong không gian', slug: 'goc-trong-khong-gian', topicSlug: 'hinh-hoc-khong-gian' },
  { name: 'Khoảng cách trong không gian', slug: 'khoang-cach-trong-khong-gian', topicSlug: 'hinh-hoc-khong-gian' },
  { name: 'Thể tích khối chóp', slug: 'the-tich-khoi-chop', topicSlug: 'hinh-hoc-khong-gian' },
  { name: 'Thể tích khối lăng trụ', slug: 'the-tich-khoi-lang-tru', topicSlug: 'hinh-hoc-khong-gian' },
  { name: 'Bài toán hình học không gian tổng hợp', slug: 'bai-toan-hinh-hoc-khong-gian-tong-hop', topicSlug: 'hinh-hoc-khong-gian' },
  { name: 'Mặt nón và khối nón', slug: 'mat-non-va-khoi-non', topicSlug: 'khoi-tron-xoay' },
  { name: 'Mặt trụ và khối trụ', slug: 'mat-tru-va-khoi-tru', topicSlug: 'khoi-tron-xoay' },
  { name: 'Mặt cầu và khối cầu', slug: 'mat-cau-va-khoi-cau', topicSlug: 'khoi-tron-xoay' },
  { name: 'Nội tiếp, ngoại tiếp và bài toán tổng hợp nón-trụ-cầu', slug: 'noi-tiep-ngoai-tiep-va-bai-toan-tong-hop-non-tru-cau', topicSlug: 'khoi-tron-xoay' },
  { name: 'Vectơ trong không gian', slug: 'vecto-trong-khong-gian', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Hệ tọa độ Oxyz và tọa độ điểm', slug: 'he-toa-do-oxyz-va-toa-do-diem', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Phương trình mặt phẳng', slug: 'phuong-trinh-mat-phang', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Phương trình đường thẳng', slug: 'phuong-trinh-duong-thang', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Phương trình mặt cầu', slug: 'phuong-trinh-mat-cau', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Vị trí tương đối', slug: 'vi-tri-tuong-doi', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Góc trong Oxyz', slug: 'goc-trong-oxyz', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Khoảng cách trong Oxyz', slug: 'khoang-cach-trong-oxyz', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Bài toán Oxyz tổng hợp và thực tế', slug: 'bai-toan-oxyz-tong-hop-va-thuc-te', topicSlug: 'vecto-va-phuong-phap-toa-do-trong-khong-gian-oxyz' },
  { name: 'Quy tắc đếm', slug: 'quy-tac-dem', topicSlug: 'xac-suat-va-to-hop' },
  { name: 'Hoán vị, chỉnh hợp, tổ hợp', slug: 'hoan-vi-chinh-hop-to-hop', topicSlug: 'xac-suat-va-to-hop' },
  { name: 'Nhị thức Newton', slug: 'nhi-thuc-newton', topicSlug: 'xac-suat-va-to-hop' },
  { name: 'Xác suất cổ điển', slug: 'xac-suat-co-dien', topicSlug: 'xac-suat-va-to-hop' },
  { name: 'Các quy tắc tính xác suất', slug: 'cac-quy-tac-tinh-xac-suat', topicSlug: 'xac-suat-va-to-hop' },
  { name: 'Xác suất có điều kiện', slug: 'xac-suat-co-dieu-kien', topicSlug: 'xac-suat-va-to-hop' },
  { name: 'Xác suất toàn phần và Bayes', slug: 'xac-suat-toan-phan-va-bayes', topicSlug: 'xac-suat-va-to-hop' },
  { name: 'Biến cố độc lập', slug: 'bien-co-doc-lap', topicSlug: 'xac-suat-va-to-hop' },
  { name: 'Mẫu số liệu không ghép nhóm', slug: 'mau-so-lieu-khong-ghep-nhom', topicSlug: 'thong-ke' },
  { name: 'Mẫu số liệu ghép nhóm', slug: 'mau-so-lieu-ghep-nhom', topicSlug: 'thong-ke' },
  { name: 'Số đặc trưng đo xu thế trung tâm', slug: 'so-dac-trung-do-xu-the-trung-tam', topicSlug: 'thong-ke' },
  { name: 'Tứ phân vị', slug: 'tu-phan-vi', topicSlug: 'thong-ke' },
  { name: 'Các số đặc trưng đo mức độ phân tán', slug: 'cac-so-dac-trung-do-muc-do-phan-tan', topicSlug: 'thong-ke' },
  { name: 'Đọc, phân tích và kết luận từ số liệu', slug: 'doc-phan-tich-va-ket-luan-tu-so-lieu', topicSlug: 'thong-ke' },
  { name: 'Giá trị lượng giác', slug: 'gia-tri-luong-giac', topicSlug: 'luong-giac' },
  { name: 'Công thức lượng giác', slug: 'cong-thuc-luong-giac', topicSlug: 'luong-giac' },
  { name: 'Hàm số lượng giác', slug: 'ham-so-luong-giac', topicSlug: 'luong-giac' },
  { name: 'Phương trình lượng giác cơ bản', slug: 'phuong-trinh-luong-giac-co-ban', topicSlug: 'luong-giac' },
  { name: 'Phương trình lượng giác tổng hợp', slug: 'phuong-trinh-luong-giac-tong-hop', topicSlug: 'luong-giac' },
  { name: 'Bài toán thực tế sử dụng lượng giác', slug: 'bai-toan-thuc-te-su-dung-luong-giac', topicSlug: 'luong-giac' },
  { name: 'Dãy số và quy luật dãy số', slug: 'day-so-va-quy-luat-day-so', topicSlug: 'day-so-va-cap-so' },
  { name: 'Dãy số tăng, giảm, bị chặn', slug: 'day-so-tang-giam-bi-chan', topicSlug: 'day-so-va-cap-so' },
  { name: 'Cấp số cộng', slug: 'cap-so-cong', topicSlug: 'day-so-va-cap-so' },
  { name: 'Cấp số nhân', slug: 'cap-so-nhan', topicSlug: 'day-so-va-cap-so' },
  { name: 'Tổng các số hạng của cấp số', slug: 'tong-cac-so-hang-cua-cap-so', topicSlug: 'day-so-va-cap-so' },
  { name: 'Bài toán thực tế sử dụng dãy số và cấp số', slug: 'bai-toan-thuc-te-su-dung-day-so-va-cap-so', topicSlug: 'day-so-va-cap-so' },
  { name: 'Lý thuyết đồ thị cơ bản', slug: 'ly-thuyet-do-thi-co-ban', topicSlug: 'chuyen-de-hoc-tap-va-toan-ung-dung' },
  { name: 'Đường đi Euler và Hamilton', slug: 'duong-di-euler-va-hamilton', topicSlug: 'chuyen-de-hoc-tap-va-toan-ung-dung' },
  { name: 'Bài toán đường đi tối ưu', slug: 'bai-toan-duong-di-toi-uu', topicSlug: 'chuyen-de-hoc-tap-va-toan-ung-dung' },
  { name: 'Bài toán tối ưu bằng mô hình toán học', slug: 'bai-toan-toi-uu-bang-mo-hinh-toan-hoc', topicSlug: 'chuyen-de-hoc-tap-va-toan-ung-dung' },
  { name: 'Bài toán tối ưu tuyến tính và bất phương trình', slug: 'bai-toan-toi-uu-tuyen-tinh-va-bat-phuong-trinh', topicSlug: 'chuyen-de-hoc-tap-va-toan-ung-dung' },
  { name: 'Bài toán thực tế tổng hợp', slug: 'bai-toan-thuc-te-tong-hop', topicSlug: 'chuyen-de-hoc-tap-va-toan-ung-dung' },
];

export const canonicalTopicBySlug = new Map(
  CANONICAL_TOPICS.map((topic) => [topic.slug, topic]),
);

export const canonicalSubtopicBySlug = new Map(
  CANONICAL_SUBTOPICS.map((subtopic) => [subtopic.slug, subtopic]),
);

export function getCanonicalTopic(slug: string): CanonicalTopic | undefined {
  return canonicalTopicBySlug.get(slug);
}

export function getCanonicalSubtopic(slug: string): CanonicalSubtopic | undefined {
  return canonicalSubtopicBySlug.get(slug);
}
