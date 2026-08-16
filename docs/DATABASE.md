# Database

V2 content uses `Exam`, `ExamVersion`, and `ExamVersionQuestion`. A published version is immutable.

Attempt history uses `Attempt.examVersionId` plus required `AttemptAnswer.examVersionQuestionId`; `(attemptId, examVersionQuestionId)` is unique. Attempt answers retain normalized responses and ScoreUnits facts, while snapshots preserve safe historical review behavior.
