-- Keep immutable V2 attempt facts protected after retiring option-index fields.
CREATE OR REPLACE FUNCTION "prevent_immutable_attempt_answer_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."attemptId" IS DISTINCT FROM OLD."attemptId"
    OR NEW."examVersionQuestionId" IS DISTINCT FROM OLD."examVersionQuestionId"
    OR NEW."isCorrect" IS DISTINCT FROM OLD."isCorrect"
    OR NEW."questionExternalId" IS DISTINCT FROM OLD."questionExternalId"
    OR NEW."questionType" IS DISTINCT FROM OLD."questionType"
    OR NEW."response" IS DISTINCT FROM OLD."response"
    OR NEW."awardedScoreUnits" IS DISTINCT FROM OLD."awardedScoreUnits"
    OR NEW."maxScoreUnits" IS DISTINCT FROM OLD."maxScoreUnits"
    OR NEW."isFullyCorrect" IS DISTINCT FROM OLD."isFullyCorrect" THEN
    RAISE EXCEPTION 'Submitted attempt answers are immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE "Question" DROP CONSTRAINT "Question_examId_fkey";
ALTER TABLE "Question" DROP CONSTRAINT "Question_subtopicId_fkey";
ALTER TABLE "Question" DROP CONSTRAINT "Question_topicId_fkey";

DROP INDEX "Exam_contentEngine_idx";

ALTER TABLE "AttemptAnswer"
DROP COLUMN "correctOptionIndex",
DROP COLUMN "selectedOptionIndex";

ALTER TABLE "Exam" DROP COLUMN "contentEngine";

DROP TABLE "Question";

DROP TYPE "ExamContentEngine";
