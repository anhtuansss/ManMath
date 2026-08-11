-- Published content and submitted grading facts are history. This migration
-- blocks mutation while deliberately leaving User -> Attempt ON DELETE SET NULL
-- untouched, so it does not decide account-deletion/privacy policy.

ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_examId_fkey";
ALTER TABLE "Attempt"
ADD CONSTRAINT "Attempt_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "prevent_immutable_exam_version_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'draft' THEN
      RAISE EXCEPTION 'Published or archived exam versions are immutable';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'published' THEN
    IF NEW."status" <> 'archived'
      OR NEW."examId" IS DISTINCT FROM OLD."examId"
      OR NEW."versionNumber" IS DISTINCT FROM OLD."versionNumber"
      OR NEW."publishProfile" IS DISTINCT FROM OLD."publishProfile"
      OR NEW."title" IS DISTINCT FROM OLD."title"
      OR NEW."description" IS DISTINCT FROM OLD."description"
      OR NEW."durationMinutes" IS DISTINCT FROM OLD."durationMinutes"
      OR NEW."subject" IS DISTINCT FROM OLD."subject"
      OR NEW."difficulty" IS DISTINCT FROM OLD."difficulty"
      OR NEW."source" IS DISTINCT FROM OLD."source"
      OR NEW."year" IS DISTINCT FROM OLD."year"
      OR NEW."statusLabel" IS DISTINCT FROM OLD."statusLabel"
      OR NEW."scoringPolicy" IS DISTINCT FROM OLD."scoringPolicy"
      OR NEW."contentChecksum" IS DISTINCT FROM OLD."contentChecksum"
      OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
      RAISE EXCEPTION 'Published exam versions may only be archived';
    END IF;
  ELSIF OLD."status" = 'archived' THEN
    IF NEW."status" <> 'archived'
      OR NEW."examId" IS DISTINCT FROM OLD."examId"
      OR NEW."versionNumber" IS DISTINCT FROM OLD."versionNumber"
      OR NEW."publishProfile" IS DISTINCT FROM OLD."publishProfile"
      OR NEW."title" IS DISTINCT FROM OLD."title"
      OR NEW."description" IS DISTINCT FROM OLD."description"
      OR NEW."durationMinutes" IS DISTINCT FROM OLD."durationMinutes"
      OR NEW."subject" IS DISTINCT FROM OLD."subject"
      OR NEW."difficulty" IS DISTINCT FROM OLD."difficulty"
      OR NEW."source" IS DISTINCT FROM OLD."source"
      OR NEW."year" IS DISTINCT FROM OLD."year"
      OR NEW."statusLabel" IS DISTINCT FROM OLD."statusLabel"
      OR NEW."scoringPolicy" IS DISTINCT FROM OLD."scoringPolicy"
      OR NEW."contentChecksum" IS DISTINCT FROM OLD."contentChecksum"
      OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
      RAISE EXCEPTION 'Archived exam versions are immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ExamVersion_prevent_immutable_mutation"
BEFORE UPDATE OR DELETE ON "ExamVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_immutable_exam_version_mutation"();

CREATE OR REPLACE FUNCTION "prevent_immutable_exam_version_question_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  version_status "ExamVersionStatus";
  target_version_id TEXT;
BEGIN
  target_version_id := CASE WHEN TG_OP = 'INSERT' THEN NEW."examVersionId" ELSE OLD."examVersionId" END;
  SELECT "status" INTO version_status FROM "ExamVersion" WHERE "id" = target_version_id;

  IF version_status IN ('published', 'archived') THEN
    RAISE EXCEPTION 'Questions of published or archived exam versions are immutable';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ExamVersionQuestion_prevent_immutable_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "ExamVersionQuestion"
FOR EACH ROW EXECUTE FUNCTION "prevent_immutable_exam_version_question_mutation"();

CREATE OR REPLACE FUNCTION "prevent_immutable_attempt_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."examId" IS DISTINCT FROM OLD."examId"
    OR NEW."examVersionId" IS DISTINCT FROM OLD."examVersionId"
    OR NEW."score" IS DISTINCT FROM OLD."score"
    OR NEW."scoringPolicy" IS DISTINCT FROM OLD."scoringPolicy"
    OR NEW."scoreUnits" IS DISTINCT FROM OLD."scoreUnits"
    OR NEW."maxScoreUnits" IS DISTINCT FROM OLD."maxScoreUnits"
    OR NEW."contentSnapshotVersion" IS DISTINCT FROM OLD."contentSnapshotVersion"
    OR NEW."examContentSnapshot" IS DISTINCT FROM OLD."examContentSnapshot"
    OR NEW."correctCount" IS DISTINCT FROM OLD."correctCount"
    OR NEW."totalQuestions" IS DISTINCT FROM OLD."totalQuestions"
    OR NEW."unansweredCount" IS DISTINCT FROM OLD."unansweredCount"
    OR NEW."startedAt" IS DISTINCT FROM OLD."startedAt"
    OR NEW."submittedAt" IS DISTINCT FROM OLD."submittedAt"
    OR NEW."durationSeconds" IS DISTINCT FROM OLD."durationSeconds"
    OR NEW."anonymousReceiptTokenHash" IS DISTINCT FROM OLD."anonymousReceiptTokenHash"
    OR NEW."anonymousReceiptExpiresAt" IS DISTINCT FROM OLD."anonymousReceiptExpiresAt" THEN
    RAISE EXCEPTION 'Submitted attempt facts are immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Attempt_prevent_immutable_mutation"
BEFORE UPDATE ON "Attempt"
FOR EACH ROW EXECUTE FUNCTION "prevent_immutable_attempt_mutation"();

CREATE OR REPLACE FUNCTION "prevent_immutable_attempt_answer_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."attemptId" IS DISTINCT FROM OLD."attemptId"
    OR NEW."questionId" IS DISTINCT FROM OLD."questionId"
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

CREATE TRIGGER "AttemptAnswer_prevent_immutable_mutation"
BEFORE UPDATE ON "AttemptAnswer"
FOR EACH ROW EXECUTE FUNCTION "prevent_immutable_attempt_answer_mutation"();
