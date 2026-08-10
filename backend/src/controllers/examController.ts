import type { Request, Response } from 'express';
import {
  getAttemptDetailById,
  getExamAttemptsByExamId,
  getExamDetailById,
  getExamSummaries,
  getPracticeByTopicSlug,
  getTopicFilters,
  submitExam,
} from '../services/examService';
import {
  ExamContentIntegrityError,
  ExamContentNotV2Error,
  getPublicExamContentById,
} from '../services/examContentReadService';
import { examDifficulties, type ExamDifficulty } from '../types/exam';
import {
  ExamContentGradeRequestError,
  gradeExamContent,
} from '../services/examContentGradingService';
import {
  createExamContentAttempt,
  ExamContentAttemptIntegrityError,
  ExamContentAttemptNotV2Error,
  ExamContentAttemptRequestError,
  getExamContentAttemptReceiptById,
  getExamContentAttemptReviewById,
  ExamContentAttemptReviewUnavailableError,
} from '../services/examContentAttemptService';

const parseOptionalInteger = (
  rawValue: unknown,
): number | null | 'invalid' => {
  if (rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return 'invalid';
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 'invalid';
  }

  return parsedValue;
};

const parseOptionalDifficulty = (
  rawValue: unknown,
): ExamDifficulty | null | 'invalid' => {
  if (rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    return 'invalid';
  }

  const normalizedValue = rawValue.trim() as ExamDifficulty;

  if (!examDifficulties.includes(normalizedValue)) {
    return 'invalid';
  }

  return normalizedValue;
};

// Endpoint kiểm tra sức khỏe của API
export const getHealth = (req: Request, res: Response): void => {
  res.json({ status: 'ok', message: 'ManMath API is running' });
};

// Lấy danh sách đề thi (không bao gồm câu hỏi và đáp án)
export const getExamList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;
    const topic =
      typeof req.query.topic === 'string' ? req.query.topic : undefined;
    const subtopic =
      typeof req.query.subtopic === 'string' ? req.query.subtopic : undefined;
    const source =
      typeof req.query.source === 'string' ? req.query.source : undefined;
    const durationMin = parseOptionalInteger(req.query.durationMin);
    const durationMax = parseOptionalInteger(req.query.durationMax);
    const year = parseOptionalInteger(req.query.year);
    const difficulty = parseOptionalDifficulty(req.query.difficulty);

    if (
      durationMin === 'invalid' ||
      durationMax === 'invalid' ||
      year === 'invalid'
    ) {
      res.status(400).json({ message: 'Bo loc duration/year khong hop le' });
      return;
    }

    if (
      typeof durationMin === 'number' &&
      typeof durationMax === 'number' &&
      durationMin > durationMax
    ) {
      res.status(400).json({ message: 'durationMin khong duoc lon hon durationMax' });
      return;
    }

    if (difficulty === 'invalid') {
      res.status(400).json({ message: 'Bo loc do kho khong hop le' });
      return;
    }

    const examSummaries = await getExamSummaries({
      search,
      topic,
      subtopic,
      source,
      durationMin: durationMin === null ? undefined : durationMin,
      durationMax: durationMax === null ? undefined : durationMax,
      difficulty: difficulty === null ? undefined : difficulty,
      year: year === null ? undefined : year,
    });

    res.json(examSummaries);
  } catch (error) {
    console.error('Failed to load exam summaries:', error);
    res.status(500).json({ message: 'Khong the lay danh sach de thi' });
  }
};

export const getTopicList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const topics = await getTopicFilters();

    res.json({ topics });
  } catch (error) {
    console.error('Failed to load topics:', error);
    res.status(500).json({ message: 'Khong the lay danh sach chuyen de' });
  }
};

// Xử lý nộp bài thi, tính điểm và trả về kết quả
export const getTopicPractice = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const limit = parseOptionalInteger(req.query.limit);

    if (limit === 'invalid' || (typeof limit === 'number' && limit <= 0)) {
      res.status(400).json({ message: 'limit khong hop le' });
      return;
    }

    const practice = await getPracticeByTopicSlug(
      req.params.topicSlug,
      limit === null ? undefined : limit,
    );

    if (!practice) {
      res.status(404).json({ message: 'Khong tim thay chuyen de de luyen tap' });
      return;
    }

    res.json(practice);
  } catch (error) {
    console.error('Failed to load topic practice:', error);
    res.status(500).json({ message: 'Khong the tao bo luyen tap theo chuyen de' });
  }
};

export const getExamDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const examDetail = await getExamDetailById(req.params.id);

    if (!examDetail) {
      res.status(404).json({ message: 'Khong tim thay de thi' });
      return;
    }

    res.json(examDetail);
  } catch (error) {
    console.error('Failed to load exam detail:', error);
    res.status(500).json({ message: 'Khong the lay chi tiet de thi' });
  }
};

export const getExamContentV2 = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const examContent = await getPublicExamContentById(req.params.id);

    if (examContent === null) {
      res.status(404).json({ message: 'Khong tim thay de thi' });
      return;
    }

    res.json(examContent);
  } catch (error) {
    if (error instanceof ExamContentNotV2Error) {
      res.status(409).json({ message: 'De thi khong co noi dung V2' });
      return;
    }

    if (error instanceof ExamContentIntegrityError) {
      console.error('V2 exam content integrity error:', error.issues);
      res.status(500).json({ message: 'Noi dung de thi V2 khong hop le' });
      return;
    }

    console.error('Failed to load V2 exam content:', error);
    res.status(500).json({ message: 'Khong the lay noi dung de thi V2' });
  }
};

export const gradeExamContentV2 = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await gradeExamContent(req.params.id, req.body);

    if (result === null) {
      res.status(404).json({ message: 'Khong tim thay de thi' });
      return;
    }

    res.json(result);
  } catch (error) {
    if (error instanceof ExamContentGradeRequestError) {
      res.status(400).json({
        message: 'Du lieu nop bai V2 khong hop le',
        issues: error.issues,
      });
      return;
    }

    if (error instanceof ExamContentNotV2Error) {
      res.status(409).json({ message: 'De thi khong co noi dung V2' });
      return;
    }

    if (error instanceof ExamContentIntegrityError) {
      console.error('V2 exam content integrity error:', error.issues);
      res.status(500).json({ message: 'Noi dung de thi V2 khong hop le' });
      return;
    }

    console.error('Failed to grade V2 exam content:', error);
    res.status(500).json({ message: 'Khong the cham de thi V2' });
  }
};

export const createExamContentAttemptV2 = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await createExamContentAttempt(
      req.params.id,
      req.body,
      req.user?.userId,
    );

    if (result === null) {
      res.status(404).json({ message: 'Khong tim thay de thi' });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    if (
      error instanceof ExamContentGradeRequestError ||
      error instanceof ExamContentAttemptRequestError
    ) {
      res.status(400).json({
        message: 'Du lieu nop bai V2 khong hop le',
      });
      return;
    }

    if (error instanceof ExamContentNotV2Error) {
      res.status(409).json({ message: 'De thi khong co noi dung V2' });
      return;
    }

    if (
      error instanceof ExamContentIntegrityError ||
      error instanceof ExamContentAttemptIntegrityError
    ) {
      console.error('V2 attempt integrity error:', error);
      res.status(500).json({ message: 'Noi dung de thi V2 khong hop le' });
      return;
    }

    console.error('Failed to create V2 exam attempt:', error);
    res.status(500).json({ message: 'Khong the luu ket qua lam bai V2' });
  }
};

export const getExamContentAttemptReceiptV2 = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const receipt = await getExamContentAttemptReceiptById(
      req.params.attemptId,
      req.user.userId,
    );

    if (receipt === null) {
      res.status(404).json({ message: 'Khong tim thay lan lam bai V2' });
      return;
    }

    res.json(receipt);
  } catch (error) {
    if (error instanceof ExamContentAttemptNotV2Error) {
      res.status(409).json({ message: 'Lan lam bai khong phai V2' });
      return;
    }

    if (error instanceof ExamContentAttemptIntegrityError) {
      console.error('V2 attempt receipt integrity error:', error);
      res.status(500).json({ message: 'Du lieu lan lam bai V2 khong hop le' });
      return;
    }

    console.error('Failed to load V2 attempt receipt:', error);
    res.status(500).json({ message: 'Khong the lay ket qua lam bai V2' });
  }
};

export const getExamContentAttemptReviewV2 = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const review = await getExamContentAttemptReviewById(
      req.params.attemptId,
      req.user.userId,
    );

    if (review === null) {
      res.status(404).json({ message: 'Khong tim thay lan lam bai V2' });
      return;
    }

    res.json(review);
  } catch (error) {
    if (error instanceof ExamContentAttemptReviewUnavailableError) {
      res.status(409).json({ message: 'Lan lam bai chua co snapshot de review' });
      return;
    }

    if (error instanceof ExamContentAttemptNotV2Error) {
      res.status(409).json({ message: 'Lan lam bai khong phai V2' });
      return;
    }

    if (error instanceof ExamContentAttemptIntegrityError) {
      console.error('V2 attempt review integrity error:', error);
      res.status(500).json({ message: 'Du lieu review V2 khong hop le' });
      return;
    }

    console.error('Failed to load V2 attempt review:', error);
    res.status(500).json({ message: 'Khong the lay review bai lam V2' });
  }
};

// Xử lý nộp bài thi, tính điểm và trả về kết quả
export const getExamAttempts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const attempts = await getExamAttemptsByExamId(req.params.id, req.user.userId);

    if (!attempts) {
      res.status(404).json({ message: 'Khong tim thay de thi' });
      return;
    }

    res.json(attempts);
  } catch (error) {
    console.error('Failed to load exam attempts:', error);
    res.status(500).json({ message: 'Khong the lay lich su lam bai' });
  }
};

// Lấy chi tiết một lần thi theo ID, bao gồm cả thông tin đề thi và câu trả lời đã chọn
export const getAttemptDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }


    const attemptDetail = await getAttemptDetailById(req.params.attemptId, req.user.userId);

    if (!attemptDetail) {
      res.status(404).json({ message: 'Khong tim thay lan lam bai' });
      return;
    }

    res.json(attemptDetail);
  } catch (error) {
    console.error('Failed to load attempt detail:', error);
    res.status(500).json({ message: 'Khong the lay chi tiet lan lam bai' });
  }
};

// Xử lý nộp bài thi, tính điểm và trả về kết quả
export const submitExamController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = await submitExam(req.body, req.user?.userId);

    if (!result.ok) {
      res.status(result.statusCode).json({ message: result.message });
      return;
    }

    res.json(result.data);
  } catch (error) {
    console.error('Failed to submit exam:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
