export type AttemptFormat = 'legacy' | 'v2';

export const getAttemptDetailHref = (
  attempt: { readonly attemptId: string; readonly examId: string; readonly attemptFormat: AttemptFormat },
): string => attempt.attemptFormat === 'v2'
  ? `/exam-v2/${attempt.examId}/result?attemptId=${encodeURIComponent(attempt.attemptId)}`
  : `/attempts/${attempt.attemptId}`;

export const getRetakeExamHref = (
  examId: string,
  attemptFormat: AttemptFormat,
): string => attemptFormat === 'v2' ? `/exam-v2/${examId}` : `/exam/${examId}`;
