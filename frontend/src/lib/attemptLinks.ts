export const getAttemptDetailHref = (attempt: { readonly attemptId: string; readonly examId: string }): string => `/exam-v2/${attempt.examId}/result?attemptId=${encodeURIComponent(attempt.attemptId)}`;
export const getRetakeExamHref = (examId: string): string => `/exam-v2/${examId}`;
