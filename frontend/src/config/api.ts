/**
 * Mục đích:
 * Một nơi duy nhất quản lý URL gốc của API backend cho frontend.
 *
 * Luồng dữ liệu:
 * Component frontend import API_BASE_URL rồi ghép với đường dẫn API như
 * /api/exams. Giá trị ưu tiên lấy từ NEXT_PUBLIC_API_BASE_URL; nếu chưa có,
 * dùng localhost khi chạy môi trường phát triển.
 *
 * File liên quan:
 * frontend/.env.local
 * frontend/src/components/exam/ExamListClient.tsx
 * frontend/src/components/exam-v2/ExamContentTakingClient.tsx
 * frontend/src/components/exam-v2/ExamContentResultClient.tsx
 */
const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = 
    rawApiBaseUrl && rawApiBaseUrl.length > 0
        ? rawApiBaseUrl.replace(/\/+$/, '') // Bỏ dấu / cuối để tránh tạo URL có //.
        : 'http://localhost:5000'; // Giá trị mặc định khi chưa cấu hình biến môi trường.
        
