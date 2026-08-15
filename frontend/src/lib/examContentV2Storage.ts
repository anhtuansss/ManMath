import type {
  V2AnswerState,
  V2AnswersByQuestionId,
  V2ExamDraft,
  V2ExamResultSession,
} from '../components/exam-v2/types';

export type V2ExamViewMode = 'all' | 'single';

const draftKey = (examId: string, examVersionId: string): string =>
  `manmath:v2:exam-draft:v2:${examId}:${examVersionId}`;
const resultKey = (examId: string): string => `manmath:v2:exam-result:${examId}`;
const viewModeKey = (examId: string, examVersionId: string): string =>
  `manmath:v2:exam-view-mode:v1:${examId}:${examVersionId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAnswerState = (value: unknown): value is V2AnswerState => {
  if (!isRecord(value) || typeof value.type !== 'string') return false;

  if (value.type === 'single_choice') {
    return typeof value.choiceId === 'string';
  }

  if (value.type === 'short_answer') {
    return typeof value.value === 'string';
  }

  if (value.type === 'true_false_group') {
    return isRecord(value.values) && Object.values(value.values).every(
      (statementValue) => typeof statementValue === 'boolean',
    );
  }

  return false;
};

const readJson = (storage: Storage, key: string): unknown | null => {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const readV2ExamDraft = (
  storage: Storage,
  examId: string,
  examVersionId: string,
): V2ExamDraft | null => {
  const value = readJson(storage, draftKey(examId, examVersionId));
  if (
    !isRecord(value) ||
    value.version !== 2 ||
    value.examVersionId !== examVersionId ||
    !isRecord(value.answers) ||
    typeof value.remainingSeconds !== 'number' ||
    !Number.isInteger(value.remainingSeconds) ||
    value.remainingSeconds < 0 ||
    typeof value.updatedAt !== 'number'
  ) {
    return null;
  }

  const answers: Record<string, V2AnswerState> = {};
  for (const [questionId, answer] of Object.entries(value.answers)) {
    if (!isAnswerState(answer)) return null;
    answers[questionId] = answer;
  }

  return {
    version: 2,
    examVersionId,
    answers: answers as V2AnswersByQuestionId,
    remainingSeconds: value.remainingSeconds,
    updatedAt: value.updatedAt,
  };
};

export const writeV2ExamDraft = (
  storage: Storage,
  examId: string,
  examVersionId: string,
  draft: V2ExamDraft,
): void => {
  storage.setItem(draftKey(examId, examVersionId), JSON.stringify(draft));
};

export const clearV2ExamDraft = (storage: Storage, examId: string, examVersionId: string): void => {
  storage.removeItem(draftKey(examId, examVersionId));
};

export const readV2ExamViewMode = (
  storage: Storage,
  examId: string,
  examVersionId: string,
): V2ExamViewMode =>
  storage.getItem(viewModeKey(examId, examVersionId)) === 'single' ? 'single' : 'all';

export const writeV2ExamViewMode = (
  storage: Storage,
  examId: string,
  examVersionId: string,
  viewMode: V2ExamViewMode,
): void => {
  storage.setItem(viewModeKey(examId, examVersionId), viewMode);
};

export const readV2ExamResult = (
  storage: Storage,
  examId: string,
): V2ExamResultSession | null => {
  const value = readJson(storage, resultKey(examId));
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.examId !== examId ||
    typeof value.examTitle !== 'string' ||
    typeof value.wasAuthenticated !== 'boolean' ||
    !isRecord(value.result)
  ) {
    return null;
  }

  return value as unknown as V2ExamResultSession;
};

export const writeV2ExamResult = (
  storage: Storage,
  examId: string,
  result: V2ExamResultSession,
): void => {
  storage.setItem(resultKey(examId), JSON.stringify(result));
};
