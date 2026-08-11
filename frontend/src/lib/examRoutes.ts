export type ExamContentEngine = 'legacy' | 'v2';

export const getExamTakingHref = (examId: string, contentEngine: ExamContentEngine): string =>
  contentEngine === 'v2' ? `/exam-v2/${examId}` : `/exam/${examId}`;
