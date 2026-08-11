import type {
  ExamDetailDto,
  ExamContentEngine,
  ExamDifficulty,
  ExamSummaryDto,
} from '../types/exam';

type ExamSummaryDbRecord = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  subject: string;
  difficulty: ExamDifficulty;
  source: string | null;
  year: number | null;
  statusLabel: string;
  contentEngine: ExamContentEngine | null;
  _count: {
    questions: number;
  };
  versions: Array<{
    title: string;
    description: string;
    durationMinutes: number;
    subject: string;
    difficulty: ExamDifficulty;
    source: string | null;
    year: number | null;
    statusLabel: string;
    _count: { questions: number };
  }>;
};

type QuestionDbRecord = {
  id: number;
  question: string;
  imageUrl: string | null;
  explanation: string | null;
  options: string[];
  optionImageUrls: string[];
  subtopic: {
    id: string;
    name: string;
    slug: string;
  } | null;
  correctAnswer: string | null;
};

type ExamDetailDbRecord = {
  id: string;
  title: string;
  durationMinutes: number;
  subject: string;
  difficulty: ExamDifficulty;
  source: string | null;
  year: number | null;
  statusLabel: string;
  questions: QuestionDbRecord[];
};

export const normalizeOptionImageUrls = (
  options: string[],
  optionImageUrls: string[],
): (string | null)[] => {
  return options.map((_, index) => {
    const imageUrl = optionImageUrls[index];

    if (typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
      return null;
    }

    return imageUrl;
  });
};

export const mapExamRecordToSummaryDto = (
  examRecord: ExamSummaryDbRecord,
): ExamSummaryDto => {
  const publishedV2Version = examRecord.contentEngine === 'v2'
    ? examRecord.versions[0]
    : undefined;
  const source = publishedV2Version ?? examRecord;

  return {
    id: examRecord.id,
    title: source.title,
    description: source.description,
    durationMinutes: source.durationMinutes,
    totalQuestions: source._count.questions,
    subject: source.subject,
    difficulty: source.difficulty,
    source: source.source,
    year: source.year ?? undefined,
    statusLabel: source.statusLabel,
    // Null is intentionally rendered as legacy during the coexistence audit.
    // It prevents an unclassified historical record from being sent to V2.
    contentEngine: examRecord.contentEngine ?? 'legacy',
  };
};

export const mapExamRecordToDetailDto = (
  examRecord: ExamDetailDbRecord,
): ExamDetailDto => {
  return {
    id: examRecord.id,
    examTitle: examRecord.title,
    durationMinutes: examRecord.durationMinutes,
    subject: examRecord.subject,
    difficulty: examRecord.difficulty,
    source: examRecord.source,
    year: examRecord.year,
    statusLabel: examRecord.statusLabel,
    questions: examRecord.questions.map((question) => ({
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

export const requireLegacyCorrectAnswer = (
  questionId: number,
  correctAnswer: string | null,
): string => {
  if (correctAnswer === null) {
    throw new Error(
      `Question ${questionId} cannot be returned by the legacy reader`,
    );
  }

  return correctAnswer;
};

export const requireLegacyCorrectOptionIndex = (
  questionId: number,
  correctOptionIndex: number | null,
): number => {
  if (correctOptionIndex === null) {
    throw new Error(
      `Question ${questionId} cannot be returned by the legacy attempt reader`,
    );
  }

  return correctOptionIndex;
};
