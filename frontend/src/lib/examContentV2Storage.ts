import type {
  V2AnswerState,
  V2AnswersByQuestionId,
  V2ExamDraft,
  V2ExamResultSession,
} from '../components/exam-v2/types';

export type V2ExamViewMode = 'all' | 'single';

const draftKey = (examId: string, examVersionId: string): string =>
  `manmath:v2:exam-draft:v3:${examId}:${examVersionId}`;
const draftReferenceKey = (examId: string): string =>
  `manmath:v2:exam-draft-reference:v1:${examId}`;
const resultKey = (examId: string): string => `manmath:v2:exam-result:${examId}`;
const viewModeKey = (examId: string, examVersionId: string): string =>
  `manmath:v2:exam-view-mode:v1:${examId}:${examVersionId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isUuidV4 = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
    value.version !== 3 ||
    value.examId !== examId ||
    value.examVersionId !== examVersionId ||
    !isRecord(value.answers) ||
    typeof value.startedAt !== 'number' ||
    !Number.isFinite(value.startedAt) ||
    typeof value.deadlineAt !== 'number' ||
    !Number.isFinite(value.deadlineAt) ||
    value.deadlineAt < value.startedAt ||
    (value.currentQuestionId !== null && typeof value.currentQuestionId !== 'string') ||
    (value.viewMode !== 'all' && value.viewMode !== 'single') ||
    (value.submissionKey !== undefined && !isUuidV4(value.submissionKey)) ||
    typeof value.updatedAt !== 'number'
  ) {
    return null;
  }

  const answers: Record<string, V2AnswerState> = {};
  for (const [questionId, answer] of Object.entries(value.answers)) {
    if (!isAnswerState(answer)) return null;
    answers[questionId] = answer;
  }

  // Checkpoint 2 drafts used the same v3 timer schema but predate submit
  // idempotency. Upgrade them on read without losing learner state.
  const submissionKey = value.submissionKey === undefined
    ? crypto.randomUUID()
    : value.submissionKey;

  return {
    version: 3,
    examId,
    examVersionId,
    startedAt: value.startedAt,
    deadlineAt: value.deadlineAt,
    answers: answers as V2AnswersByQuestionId,
    currentQuestionId: value.currentQuestionId,
    viewMode: value.viewMode,
    submissionKey,
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
  storage.setItem(draftReferenceKey(examId), JSON.stringify({ examId, examVersionId }));
};

export const clearV2ExamDraft = (storage: Storage, examId: string, examVersionId: string): void => {
  storage.removeItem(draftKey(examId, examVersionId));
  const reference = readV2ExamDraftReference(storage, examId);
  if (reference?.examVersionId === examVersionId) {
    storage.removeItem(draftReferenceKey(examId));
  }
};

export type V2ExamDraftReference = {
  readonly examId: string;
  readonly examVersionId: string;
};

export const readV2ExamDraftReference = (
  storage: Storage,
  examId: string,
): V2ExamDraftReference | null => {
  const value = readJson(storage, draftReferenceKey(examId));
  if (
    !isRecord(value) ||
    value.examId !== examId ||
    typeof value.examVersionId !== 'string' ||
    value.examVersionId.length === 0
  ) {
    return null;
  }
  return { examId, examVersionId: value.examVersionId };
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
