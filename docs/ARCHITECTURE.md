# Architecture

`Exam` is the stable logical identity. Each immutable content revision is an `ExamVersion`; its questions are `ExamVersionQuestion` rows. Public discovery, taking, practice, recommendations, history, analytics, receipts, and reviews read published V2 versions only.

An `Attempt` is pinned to `examVersionId`. Every `AttemptAnswer` references exactly one `ExamVersionQuestion` through `examVersionQuestionId` and also stores its stable external ID, normalized response, and score facts. Owner review derives safe correct-answer material from the immutable attempt snapshot; public DTOs never include answer keys.
