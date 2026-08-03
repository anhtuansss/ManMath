import type { Request, Response } from 'express';
import {
  getUserAttemptHistory,
  getUserProgress,
  getUserRecommendations,
  getUserSubtopicStats,
  getUserTopicStats,
} from '../services/analyticsService';

export const getMyTopicStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const topicStats = await getUserTopicStats(req.user.userId);

    res.json({
      topicStats,
    });
  } catch (error) {
    console.error('Failed to load user topic stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMySubtopicStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const subtopicStats = await getUserSubtopicStats(req.user.userId);

    res.json({
      subtopicStats,
    });
  } catch (error) {
    console.error('Failed to load user subtopic stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyRecommendations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const recommendations = await getUserRecommendations(req.user.userId);

    res.json(recommendations);
  } catch (error) {
    console.error('Failed to load user recommendations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyProgress = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const progress = await getUserProgress(req.user.userId);

    res.json(progress);
  } catch (error) {
    console.error('Failed to load user progress:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const parseOptionalPositiveInteger = (
  rawValue: unknown,
): number | null | 'invalid' => {
  if (rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return 'invalid';
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return 'invalid';
  }

  return parsedValue;
};

const MAX_ATTEMPT_HISTORY_LIMIT = 50;

export const getMyAttempts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const page = parseOptionalPositiveInteger(req.query.page);
    const limit = parseOptionalPositiveInteger(req.query.limit);
    const examId =
      typeof req.query.examId === 'string' ? req.query.examId.trim() : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : undefined;

    if (page === 'invalid') {
      res.status(400).json({ message: 'page khong hop le' });
      return;
    }

    if (limit === 'invalid' || (typeof limit === 'number' && limit > MAX_ATTEMPT_HISTORY_LIMIT)) {
      res.status(400).json({ message: 'limit khong hop le' });
      return;
    }

    if (sort && sort !== 'latest') {
      res.status(400).json({ message: 'sort khong hop le' });
      return;
    }

    const attempts = await getUserAttemptHistory(req.user.userId, {
      page: page === null ? undefined : page,
      limit: limit === null ? undefined : limit,
      examId: examId && examId.length > 0 ? examId : undefined,
    });

    res.json(attempts);
  } catch (error) {
    console.error('Failed to load user attempt history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
