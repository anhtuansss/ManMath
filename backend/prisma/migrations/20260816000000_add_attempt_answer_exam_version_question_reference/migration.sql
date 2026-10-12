-- Add the canonical V2 question reference without changing the legacy ordinal.
ALTER TABLE "AttemptAnswer"
ADD COLUMN "examVersionQuestionId" TEXT;

-- Keep canonical lookups efficient while the reference remains nullable.
CREATE INDEX "AttemptAnswer_examVersionQuestionId_idx"
ON "AttemptAnswer"("examVersionQuestionId");

-- Prevent a populated reference from becoming orphaned. Historical answers remain
-- intact because this migration neither changes nor removes questionId.
ALTER TABLE "AttemptAnswer"
ADD CONSTRAINT "AttemptAnswer_examVersionQuestionId_fkey"
FOREIGN KEY ("examVersionQuestionId")
REFERENCES "ExamVersionQuestion"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
