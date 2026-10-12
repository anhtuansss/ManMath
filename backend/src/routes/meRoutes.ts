import { Router } from 'express';
import {
  getMyAttempts,
  getMyLearningOverview,
  getMyProgress,
  getMyRecommendations,
  getMySubtopicStats,
  getMyTopicStats,
} from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/authMiddleware';

export const meRouter = Router();

meRouter.get('/topic-stats', authMiddleware, getMyTopicStats);
meRouter.get('/learning-overview', authMiddleware, getMyLearningOverview);
meRouter.get('/subtopic-stats', authMiddleware, getMySubtopicStats);
meRouter.get('/recommendations', authMiddleware, getMyRecommendations);
meRouter.get('/progress', authMiddleware, getMyProgress);
meRouter.get('/attempts', authMiddleware, getMyAttempts);
