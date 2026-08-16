import { Router } from 'express';
import { createExamContentAttemptV2, getAnonymousExamContentAttemptReceiptV2, getExamContentAttemptReceiptV2, getExamContentAttemptReviewV2, getExamContentDraftPreviewV2, getExamContentV2, getExamList, getHealth, getReadiness, getTopicList, getTopicPracticeV2, gradeExamContentV2, gradeTopicPracticeV2 } from '../controllers/examController';
import { authMiddleware, draftPreviewAuthorizationMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';

export const examRouter = Router();
examRouter.get('/health', getHealth); examRouter.get('/ready', getReadiness);
examRouter.get('/exams', getExamList); examRouter.get('/topics', getTopicList);
examRouter.get('/v2/practice/topic/:topicSlug', getTopicPracticeV2); examRouter.post('/v2/practice/grade', gradeTopicPracticeV2);
examRouter.get('/v2/exams/:id', getExamContentV2); examRouter.post('/v2/exams/:id/grade', gradeExamContentV2);
examRouter.post('/v2/exams/:id/attempts', optionalAuthMiddleware, createExamContentAttemptV2);
examRouter.get('/v2/internal/exam-previews/:id', authMiddleware, draftPreviewAuthorizationMiddleware, getExamContentDraftPreviewV2);
examRouter.get('/v2/attempts/:attemptId', authMiddleware, getExamContentAttemptReceiptV2);
examRouter.get('/v2/attempts/:attemptId/anonymous-receipt', getAnonymousExamContentAttemptReceiptV2);
examRouter.get('/v2/attempts/:attemptId/review', authMiddleware, getExamContentAttemptReviewV2);
