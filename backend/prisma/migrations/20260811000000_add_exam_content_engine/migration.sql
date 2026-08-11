-- Additive coexistence metadata. NULL is intentionally retained for historical
-- rows that have not yet been classified by the V2 content audit.
CREATE TYPE "ExamContentEngine" AS ENUM ('legacy', 'v2');

ALTER TABLE "Exam"
ADD COLUMN "contentEngine" "ExamContentEngine";

CREATE INDEX "Exam_contentEngine_idx" ON "Exam"("contentEngine");
