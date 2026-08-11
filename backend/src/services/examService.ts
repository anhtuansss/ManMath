import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  mapExamRecordToDetailDto,
  mapExamRecordToSummaryDto,
  normalizeOptionImageUrls,
  requireLegacyCorrectAnswer,
  requireLegacyCorrectOptionIndex,
} from '../lib/examMapper';
import type {
  ExamDifficulty,
  ExamAttemptDetailDto,
  ExamAttemptSummaryDto,
  ExamDetailDto,
  PracticeTopicDto,
  ExamSummaryDto,
  TopicFilterDto,
  TopicStatDto,
} from '../types/exam';

export type GetExamSummariesFilters = {
  search?: string;
  topic?: string;
  subtopic?: string;
  durationMin?: number;
  durationMax?: number;
  difficulty?: ExamDifficulty;
  source?: string;
  year?: number;
};

export type SubmitExamRequestDto = {
  examId?: string;
  answers?: Record<number, number>;
  durationSeconds?: number;
};

export type SubmitExamResultDto = {
  correctCount: number;
  totalQuestions: number;
  score: number;
  topicStats: TopicStatDto[];
};

type ValidationResult =
  | { ok: true; answers: Record<number, number> }
  | { ok: false; message: string };

export type SubmitExamServiceResult =
  | { ok: true; data: SubmitExamResultDto }
  | { ok: false; statusCode: 400 | 404 | 409; message: string };

export class LegacyExamReadNotSupportedError extends Error {
  constructor(examId: string) {
    super(`Exam ${examId} is V2 content and cannot be read by the legacy API`);
  }
}

type SubmittedQuestionResult = {
  questionId: number;
  isCorrect: boolean;
};

type TopicStatAccumulator = {
  topicId: string | null;
  topicName: string;
  topicSlug: string | null;
  correct: number;
  total: number;
};

const DEFAULT_PRACTICE_LIMIT = 10;
const MAX_PRACTICE_LIMIT = 20;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeSearchText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
};

// Hàm kiểm tra và chuẩn hóa dữ liệu câu trả lời khi nộp bài thi
const normalizeSubmitAnswers = (
  exam: ExamDetailDto,
  rawAnswers: unknown,
): ValidationResult => {
  if (!isPlainObject(rawAnswers)) {
    return {
      ok: false,
      message: 'Du lieu cau tra loi khong hop le',
    };
  }

  const questionMap = new Map(exam.questions.map((question) => [question.id, question]));
  const normalizedAnswers: Record<number, number> = {};

  for (const [rawQuestionId, rawSelectedOptionIndex] of Object.entries(rawAnswers)) {
    if (!/^\d+$/.test(rawQuestionId)) {
      return {
        ok: false,
        message: 'Cau tra loi khong hop le',
      };
    }

    const questionId = Number(rawQuestionId);
    const question = questionMap.get(questionId);

    if (!question) {
      return {
        ok: false,
        message: 'Cau tra loi khong hop le',
      };
    }

    if (
      typeof rawSelectedOptionIndex !== 'number' ||
      !Number.isInteger(rawSelectedOptionIndex)
    ) {
      return {
        ok: false,
        message: 'Lua chon tra loi khong hop le',
      };
    }

    if (rawSelectedOptionIndex < 0 || rawSelectedOptionIndex >= question.options.length) {
      return {
        ok: false,
        message: 'Lua chon tra loi khong hop le',
      };
    }

    normalizedAnswers[questionId] = rawSelectedOptionIndex;
  }

  return {
    ok: true,
    answers: normalizedAnswers,
  };
};

// Lấy danh sách tóm tắt các đề thi
export const getExamSummaries = async (
  filters?: GetExamSummariesFilters,
): Promise<ExamSummaryDto[]> => {
  const normalizedSearch = filters?.search?.trim();
  const normalizedTopic = filters?.topic?.trim();
  const normalizedSubtopic = filters?.subtopic?.trim();
  const durationMin = filters?.durationMin;
  const durationMax = filters?.durationMax;
  const difficulty = filters?.difficulty;
  const source = filters?.source?.trim();
  const year = filters?.year;
  const exams = await prisma.exam.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      subject: true,
      difficulty: true,
      source: true,
      year: true,
      statusLabel: true,
      contentEngine: true,
      _count: {
        select: {
          questions: true,
        },
      },
      questions: {
        select: {
          topic: { select: { slug: true } },
          subtopic: { select: { slug: true } },
        },
      },
      versions: {
        where: { status: 'published' },
        orderBy: { versionNumber: 'desc' },
        take: 1,
        select: {
          title: true,
          description: true,
          durationMinutes: true,
          subject: true,
          difficulty: true,
          source: true,
          year: true,
          statusLabel: true,
          _count: { select: { questions: true } },
          questions: { select: { topicSlug: true, subtopicSlug: true } },
        },
      },
    },
  });

  const searchKeyword = normalizedSearch ? normalizeSearchText(normalizedSearch) : null;
  return exams
    .filter((exam) => exam.contentEngine !== 'v2' || exam.versions.length === 1)
    .map((exam) => ({
      summary: mapExamRecordToSummaryDto(exam),
      taxonomy: exam.contentEngine === 'v2'
        ? exam.versions[0]?.questions.map((question) => ({ topicSlug: question.topicSlug, subtopicSlug: question.subtopicSlug })) ?? []
        : exam.questions.map((question) => ({ topicSlug: question.topic?.slug ?? null, subtopicSlug: question.subtopic?.slug ?? null })),
    }))
    .filter(({ summary, taxonomy }) => {
      if (searchKeyword && !normalizeSearchText(`${summary.title} ${summary.description}`).includes(searchKeyword)) return false;
      if (normalizedTopic && !taxonomy.some((question) => question.topicSlug === normalizedTopic)) return false;
      if (normalizedSubtopic && !taxonomy.some((question) => question.subtopicSlug === normalizedSubtopic)) return false;
      if (typeof durationMin === 'number' && summary.durationMinutes < durationMin) return false;
      if (typeof durationMax === 'number' && summary.durationMinutes > durationMax) return false;
      if (difficulty && summary.difficulty !== difficulty) return false;
      if (source && !(summary.source ?? '').toLocaleLowerCase('vi').includes(source.toLocaleLowerCase('vi'))) return false;
      return !(typeof year === 'number' && summary.year !== year);
    })
    .map(({ summary }) => summary);
};

export const getTopicFilters = async (): Promise<TopicFilterDto[]> => {
  const topics = await prisma.topic.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      subtopics: {
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    subtopics: topic.subtopics.map((subtopic) => ({
      id: subtopic.id,
      name: subtopic.name,
      slug: subtopic.slug,
    })),
  }));
};

export const getPracticeByTopicSlug = async (
  topicSlug: string,
  limit = DEFAULT_PRACTICE_LIMIT,
): Promise<PracticeTopicDto | null> => {
  const normalizedTopicSlug = topicSlug.trim();

  if (normalizedTopicSlug.length === 0) {
    return null;
  }

  const safeLimit = Math.min(Math.max(limit, 1), MAX_PRACTICE_LIMIT);
  const topic = await prisma.topic.findUnique({
    where: {
      slug: normalizedTopicSlug,
    },
    select: {
      name: true,
      slug: true,
      questions: {
        where: {
          exam: { contentEngine: { not: 'v2' } },
        },
        take: safeLimit,
        orderBy: [{ exam: { createdAt: 'desc' } }, { order: 'asc' }],
        select: {
          id: true,
          question: true,
          imageUrl: true,
          explanation: true,
          options: true,
          optionImageUrls: true,
          subtopic: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          correctAnswer: true,
        },
      },
    },
  });

  if (!topic) {
    return null;
  }

  const questionCount = topic.questions.length;
  const durationMinutes =
    questionCount > 0 ? Math.max(10, Math.ceil(questionCount * 1.5)) : 10;

  return {
    practiceId: `practice-topic-${topic.slug}-${questionCount}`,
    topic: {
      name: topic.name,
      slug: topic.slug,
    },
    title: `Luyen chuyen de: ${topic.name}`,
    durationMinutes,
    questions: topic.questions.map((question) => ({
      id: question.id,
      question: question.question,
      imageUrl: question.imageUrl,
      explanation: question.explanation,
      options: question.options,
      optionImageUrls: normalizeOptionImageUrls(
        question.options,
        question.optionImageUrls,
      ),
      subtopic: question.subtopic,
      correctAnswer: requireLegacyCorrectAnswer(
        question.id,
        question.correctAnswer,
      ),
    })),
  };
};

// Lấy chi tiết đề thi theo ID, bao gồm cả câu hỏi và đáp án
export const getExamDetailById = async (
  examId: string,
): Promise<ExamDetailDto | null> => {
  const examRecord = await prisma.exam.findUnique({
    where: {
      id: examId,
    },
    select: {
      id: true,
      title: true,
      durationMinutes: true,
      subject: true,
      difficulty: true,
      source: true,
      year: true,
      statusLabel: true,
      contentEngine: true,
      questions: {
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          question: true,
          imageUrl: true,
          explanation: true,
          options: true,
          optionImageUrls: true,
          subtopic: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          correctAnswer: true,
        },
      },
    },
  });

  if (!examRecord) {
    return null;
  }

  if (examRecord.contentEngine === 'v2') {
    throw new LegacyExamReadNotSupportedError(examId);
  }

  return mapExamRecordToDetailDto(examRecord);
};

// Lấy danh sách các lần thi đã nộp cho một đề thi cụ thể
export const getExamAttemptsByExamId = async (
  examId: string,
  userId: string,
): Promise<ExamAttemptSummaryDto[] | null> => {
  const examRecord = await prisma.exam.findUnique({
    where: {
      id: examId,
    },
    select: {
      contentEngine: true,
      attempts: {
        where: {
          userId,
        },
        orderBy: {
          submittedAt: 'desc',
        },
        select: {
          id: true,
          examId: true,
          scoringPolicy: true,
          score: true,
          correctCount: true,
          totalQuestions: true,
          unansweredCount: true,
          durationSeconds: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!examRecord) {
    return null;
  }

  if (examRecord.contentEngine === 'v2') {
    throw new LegacyExamReadNotSupportedError(examId);
  }

  return examRecord.attempts.map((attempt) => ({
    id: attempt.id,
    examId: attempt.examId,
    attemptFormat: attempt.scoringPolicy === null ? 'legacy' : 'v2',
    score: attempt.score,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    unansweredCount: attempt.unansweredCount,
    durationSeconds: attempt.durationSeconds,
    submittedAt: attempt.submittedAt.toISOString(),
  }));
};

// Lấy chi tiết một lần thi theo ID, bao gồm cả thông tin đề thi và câu trả lời đã chọn
export const getAttemptDetailById = async (
  attemptId: string,
  userId: string,
): Promise<ExamAttemptDetailDto | null> => {
  const attemptRecord = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    select: {
      id: true,
      examId: true,
      scoringPolicy: true,
      score: true,
      correctCount: true,
      totalQuestions: true,
      unansweredCount: true,
      durationSeconds: true,
      submittedAt: true,
      exam: {
        select: {
          id: true,
          contentEngine: true,
          title: true,
          durationMinutes: true,
          questions: {
            orderBy: {
              order: 'asc',
            },
            select: {
              id: true,
              question: true,
              imageUrl: true,
              explanation: true,
              options: true,
              optionImageUrls: true,
              subtopic: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              topic: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
      answers: {
        select: {
          questionId: true,
          selectedOptionIndex: true,
          correctOptionIndex: true,
          isCorrect: true,
        },
      },
    },
  });

  if (!attemptRecord) {
    return null;
  }

  if (attemptRecord.exam.contentEngine === 'v2') {
    throw new LegacyExamReadNotSupportedError(attemptRecord.examId);
  }

  const answerMap = new Map(
    attemptRecord.answers.map((answer) => [answer.questionId, answer]),
  );

  const topicStatMap = new Map<
    string,
    {
      topicId: string | null;
      topicName: string;
      topicSlug: string | null;
      correct: number;
      total: number;
    }
  >();

  for (const question of attemptRecord.exam.questions) {
    const answer = answerMap.get(question.id);

    if (!answer) {
      continue;
    }

    const topicKey = question.topic?.id ?? 'uncategorized';
    const existingStat = topicStatMap.get(topicKey);

    if (existingStat) {
      existingStat.total += 1;

      if (answer.isCorrect) {
        existingStat.correct += 1;
      }

      continue;
    }

    topicStatMap.set(topicKey, {
      topicId: question.topic?.id ?? null,
      topicName: question.topic?.name ?? 'Chưa phân loại',
      topicSlug: question.topic?.slug ?? null,
      correct: answer.isCorrect ? 1 : 0,
      total: 1,
    });
  }

  const topicStats: TopicStatDto[] = Array.from(topicStatMap.values()).map(
    (topicStat) => ({
      ...topicStat,
      accuracy:
        topicStat.total > 0
          ? Math.round((topicStat.correct / topicStat.total) * 100)
          : 0,
      awardedScoreUnits: 0,
      maxScoreUnits: 0,
      masteryPercentage: null,
      analyticsConfidence: 'legacy_best_effort' as const,
    }),
  );

  return {
    attempt: {
      id: attemptRecord.id,
      examId: attemptRecord.examId,
      attemptFormat: attemptRecord.scoringPolicy === null ? 'legacy' : 'v2',
      score: attemptRecord.score,
      correctCount: attemptRecord.correctCount,
      totalQuestions: attemptRecord.totalQuestions,
      unansweredCount: attemptRecord.unansweredCount,
      durationSeconds: attemptRecord.durationSeconds,
      submittedAt: attemptRecord.submittedAt.toISOString(),
    },
    exam: {
      id: attemptRecord.exam.id,
      title: attemptRecord.exam.title,
      durationMinutes: attemptRecord.exam.durationMinutes,
    },
    answers: attemptRecord.exam.questions.flatMap((question) => {
      const answer = answerMap.get(question.id);

      if (!answer) {
        return [];
      }

      return {
        questionId: question.id,
        question: question.question,
        imageUrl: question.imageUrl,
        explanation: question.explanation,
        options: question.options,
        optionImageUrls: normalizeOptionImageUrls(
          question.options,
          question.optionImageUrls,
        ),
        subtopic: question.subtopic,
        selectedOptionIndex: answer.selectedOptionIndex,
        correctOptionIndex: requireLegacyCorrectOptionIndex(
          question.id,
          answer.correctOptionIndex,
        ),
        isCorrect: answer.isCorrect,
      };
    }),
    topicStats,
  };
};

const buildTopicStatsForSubmittedQuestions = async (
  submittedQuestionResults: SubmittedQuestionResult[],
): Promise<TopicStatDto[]> => {
  if (submittedQuestionResults.length === 0) {
    return [];
  }

  const questionTopics = await prisma.question.findMany({
    where: {
      id: {
        in: submittedQuestionResults.map((questionResult) => questionResult.questionId),
      },
    },
    select: {
      id: true,
      topic: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const topicByQuestionId = new Map(
    questionTopics.map((question) => [question.id, question.topic]),
  );

  const topicStatMap = new Map<string, TopicStatAccumulator>();

  for (const questionResult of submittedQuestionResults) {
    const topic = topicByQuestionId.get(questionResult.questionId);
    const topicKey = topic?.id ?? 'uncategorized';
    const existingStat = topicStatMap.get(topicKey);

    if (existingStat) {
      existingStat.total += 1;

      if (questionResult.isCorrect) {
        existingStat.correct += 1;
      }

      continue;
    }

    topicStatMap.set(topicKey, {
      topicId: topic?.id ?? null,
      topicName: topic?.name ?? 'Chưa phân loại',
      topicSlug: topic?.slug ?? null,
      correct: questionResult.isCorrect ? 1 : 0,
      total: 1,
    });
  }

  return Array.from(topicStatMap.values())
    .map((topicStat) => ({
      ...topicStat,
      accuracy:
        topicStat.total > 0
          ? Math.round((topicStat.correct / topicStat.total) * 100)
          : 0,
      awardedScoreUnits: 0,
      maxScoreUnits: 0,
      masteryPercentage: null,
      analyticsConfidence: 'legacy_best_effort' as const,
    }))
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return a.accuracy - b.accuracy;
      }

      return a.topicName.localeCompare(b.topicName, 'vi');
    });
};

// Xử lý nộp bài thi, tính điểm và trả về kết quả
export const submitExam = async (
  payload: unknown,
  userId?: string,
): Promise<SubmitExamServiceResult> => {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Du lieu nop bai khong hop le',
    };
  }

  const { examId, answers, durationSeconds } =
  payload as Partial<SubmitExamRequestDto>;

  if (typeof examId !== 'string' || examId.trim().length === 0) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Thieu examId hop le',
    };
  }

  if (
    durationSeconds !== undefined &&
    (typeof durationSeconds !== 'number' ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 0)
  ) {
    return {
      ok: false,
      statusCode: 400,
      message: 'Thoi gian lam bai khong hop le',
    };
  }

  let exam: ExamDetailDto | null;
  try {
    exam = await getExamDetailById(examId.trim());
  } catch (error) {
    if (error instanceof LegacyExamReadNotSupportedError) {
      return {
        ok: false,
        statusCode: 409,
        message: 'De thi chi ho tro API V2',
      };
    }
    throw error;
  }

  if (!exam) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Khong tim thay de thi de cham diem',
    };
  }

  const validatedAnswers = normalizeSubmitAnswers(exam, answers);

  if (!validatedAnswers.ok) {
    return {
      ok: false,
      statusCode: 400,
      message: validatedAnswers.message,
    };
  }

  let correctCount = 0;
  const submittedQuestionResults: SubmittedQuestionResult[] = [];

  for (const question of exam.questions) {
    const selectedOptionIndex = validatedAnswers.answers[question.id];
    const correctIndex = question.options.indexOf(question.correctAnswer);
    const isCorrect = selectedOptionIndex === correctIndex;

    if (isCorrect) {
      correctCount++;
    }

    submittedQuestionResults.push({
      questionId: question.id,
      isCorrect,
    });
  }

  const totalQuestions = exam.questions.length;
  const unansweredCount = exam.questions.filter((question) => {
    return validatedAnswers.answers[question.id] === undefined;
  }).length;
  const score = Math.round((correctCount / totalQuestions) * 10);
  const topicStats = await buildTopicStatsForSubmittedQuestions(
    submittedQuestionResults,
  );

  await prisma.attempt.create({
    data: {
      examId: exam.id,
      userId: userId ?? null,
      score,
      correctCount,
      totalQuestions,
      unansweredCount,
      durationSeconds: durationSeconds ?? null,
      answers: {
        create: exam.questions.map((question) => {
          const selectedOptionIndex = validatedAnswers.answers[question.id];
          const correctOptionIndex = question.options.indexOf(question.correctAnswer);
          const isAnswered = selectedOptionIndex !== undefined;

          return {
            questionId: question.id,
            selectedOptionIndex: isAnswered ? selectedOptionIndex : null,
            correctOptionIndex,
            isCorrect: isAnswered && selectedOptionIndex === correctOptionIndex,
          };
        }),
      },
    },
  });

  return {
    ok: true,
    data: {
      correctCount,
      totalQuestions,
      score,
      topicStats,
    },
  };
};
