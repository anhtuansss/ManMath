import { Router } from 'express';
import {
  getAttemptDetail,
  getExamAttempts,
  getExamContentV2,
  getExamContentDraftPreviewV2,
  getExamDetail,
  getExamList,
  getHealth,
  getReadiness,
  getTopicPractice,
  getTopicList,
  createExamContentAttemptV2,
  getAnonymousExamContentAttemptReceiptV2,
  getExamContentAttemptReceiptV2,
  getExamContentAttemptReviewV2,
  submitExamController,
  gradeExamContentV2,
} from '../controllers/examController';
import { 
  authMiddleware, 
  draftPreviewAuthorizationMiddleware,
  optionalAuthMiddleware 
} from '../middleware/authMiddleware';

export const examRouter = Router();

// Endpoint kiểm tra sức khỏe của API
examRouter.get('/health', getHealth);
examRouter.get('/ready', getReadiness);

// Lấy danh sách đề thi (không bao gồm câu hỏi và đáp án)
examRouter.get('/exams', getExamList);
examRouter.get('/topics', getTopicList);
examRouter.get('/practice/topic/:topicSlug', getTopicPractice);
examRouter.get('/v2/exams/:id', getExamContentV2);
examRouter.get(
  '/v2/internal/exam-previews/:id',
  authMiddleware,
  draftPreviewAuthorizationMiddleware,
  getExamContentDraftPreviewV2,
);

// Lấy danh sách các lần thi đã nộp cho một đề thi cụ thể
examRouter.get('/exams/:id/attempts', authMiddleware, getExamAttempts);

// Lấy chi tiết đề thi theo ID, bao gồm cả câu hỏi và đáp án
examRouter.get('/exams/:id', getExamDetail);

// Lấy chi tiết một lần thi theo ID, bao gồm cả thông tin đề thi và câu trả lời đã chọn
examRouter.get('/attempts/:attemptId', authMiddleware, getAttemptDetail);

// Xử lý nộp bài thi, tính điểm và trả về kết quả
examRouter.post('/exam/submit', optionalAuthMiddleware, submitExamController);

examRouter.post('/v2/exams/:id/grade', gradeExamContentV2);
examRouter.post(
  '/v2/exams/:id/attempts',
  optionalAuthMiddleware,
  createExamContentAttemptV2,
);
examRouter.get(
  '/v2/attempts/:attemptId',
  authMiddleware,
  getExamContentAttemptReceiptV2,
);
examRouter.get(
  '/v2/attempts/:attemptId/anonymous-receipt',
  getAnonymousExamContentAttemptReceiptV2,
);
examRouter.get(
  '/v2/attempts/:attemptId/review',
  authMiddleware,
  getExamContentAttemptReviewV2,
);
