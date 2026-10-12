ALTER TABLE "AttemptAnswer"
ALTER COLUMN "examVersionQuestionId" SET NOT NULL;

CREATE UNIQUE INDEX "AttemptAnswer_attemptId_examVersionQuestionId_key"
ON "AttemptAnswer"("attemptId", "examVersionQuestionId");
