/**
 * Mục đích:
 * Điểm khởi động Express API cho MVP ManMath.
 *
 * Luồng dữ liệu:
 * server.ts chỉ cấu hình app, middleware và mount API routes.
 * Logic xử lý request nằm trong controllers, business logic nằm trong services.
 *
 * File liên quan:
 * backend/src/routes/examRoutes.ts
 * backend/src/controllers/examController.ts
 * backend/src/services/examService.ts
 */
import { createApp } from './src/app';

const app = createApp();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
});
