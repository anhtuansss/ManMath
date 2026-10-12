-- Preserve submitted-answer immutability after retiring the legacy ordinal.
CREATE OR REPLACE FUNCTION "prevent_immutable_attempt_answer_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."attemptId" IS DISTINCT FROM OLD."attemptId"
    OR NEW."examVersionQuestionId" IS DISTINCT FROM OLD."examVersionQuestionId"
    OR NEW."selectedOptionIndex" IS DISTINCT FROM OLD."selectedOptionIndex"
    OR NEW."correctOptionIndex" IS DISTINCT FROM OLD."correctOptionIndex"
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

DROP INDEX "AttemptAnswer_attemptId_questionId_key";
DROP INDEX "AttemptAnswer_questionId_idx";

ALTER TABLE "AttemptAnswer"
DROP COLUMN "questionId";
