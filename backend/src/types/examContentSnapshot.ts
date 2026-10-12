import type {
  QuestionInput,
  ScoringPolicyId,
} from './examContent';

export type ExamContentSnapshotV1 = {
  readonly version: 1;
  readonly exam: {
    readonly id: string;
    readonly title: string;
    readonly durationMinutes: number;
    readonly subject: string;
    readonly scoringPolicyId: ScoringPolicyId;
  };
  readonly questions: readonly QuestionInput[];
};