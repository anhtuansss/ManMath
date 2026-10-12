ALTER TYPE "PracticeSessionStatus" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE "PracticeSession"
  ADD COLUMN "subtopicId" TEXT,
  ADD COLUMN "requestedQuestionCount" INTEGER,
  ADD COLUMN "selectedQuestionTypes" "QuestionType"[],
  ADD COLUMN "selectionSeed" TEXT;

UPDATE "PracticeSession"
SET
  "requestedQuestionCount" = "totalQuestions",
  "selectedQuestionTypes" = ARRAY['single_choice', 'true_false_group', 'short_answer']::"QuestionType"[],
  "selectionSeed" = 'legacy:' || "id"
WHERE "requestedQuestionCount" IS NULL;

ALTER TABLE "PracticeSession"
  ALTER COLUMN "requestedQuestionCount" SET NOT NULL,
  ALTER COLUMN "selectedQuestionTypes" SET NOT NULL,
  ALTER COLUMN "selectionSeed" SET NOT NULL,
  ADD CONSTRAINT "PracticeSession_subtopicId_fkey"
    FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE RESTRICT;

CREATE INDEX "PracticeSession_subtopicId_status_idx" ON "PracticeSession"("subtopicId", "status");

CREATE OR REPLACE FUNCTION "prevent_completed_practice_session_mutation"()
RETURNS TRIGGER AS $$ BEGIN
  IF OLD."status" IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Terminal practice sessions are immutable';
  END IF;
  IF OLD."topicId" IS DISTINCT FROM NEW."topicId"
    OR OLD."subtopicId" IS DISTINCT FROM NEW."subtopicId"
    OR OLD."requestedQuestionCount" IS DISTINCT FROM NEW."requestedQuestionCount"
    OR OLD."selectedQuestionTypes" IS DISTINCT FROM NEW."selectedQuestionTypes"
    OR OLD."selectionSeed" IS DISTINCT FROM NEW."selectionSeed" THEN
    RAISE EXCEPTION 'Practice session configuration is immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "prevent_completed_practice_answer_mutation"()
RETURNS TRIGGER AS $$ DECLARE state "PracticeSessionStatus"; BEGIN
  SELECT "status" INTO state FROM "PracticeSessionQuestion" q JOIN "PracticeSession" s ON s."id" = q."practiceSessionId" WHERE q."id" = OLD."practiceSessionQuestionId";
  IF state IN ('completed', 'cancelled') THEN RAISE EXCEPTION 'Terminal practice answers are immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
