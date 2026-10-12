CREATE TYPE "QuestionBankItemStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "QuestionSourceType" AS ENUM ('official', 'mock', 'curated');

CREATE TABLE "QuestionBankImportBatch" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceType" "QuestionSourceType" NOT NULL,
  "sourceYear" INTEGER,
  "sourceDocumentRef" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionBankImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionBankImportBatch_externalId_key" ON "QuestionBankImportBatch"("externalId");

CREATE TABLE "QuestionBankItem" (
  "id" TEXT NOT NULL,
  "logicalKey" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "status" "QuestionBankItemStatus" NOT NULL DEFAULT 'draft',
  "importBatchId" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "subtopicId" TEXT NOT NULL,
  "sourceQuestionRef" TEXT,
  "assetSource" TEXT,
  "provenanceFingerprint" TEXT NOT NULL,
  "contentFingerprint" TEXT NOT NULL,
  "type" "QuestionType" NOT NULL,
  "section" INTEGER NOT NULL,
  "sourceOrder" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "assets" JSONB,
  "choices" JSONB,
  "statements" JSONB,
  "answerKey" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionBankItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuestionBankItem_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "QuestionBankImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QuestionBankItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QuestionBankItem_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "QuestionBankItem_logicalKey_revision_key" ON "QuestionBankItem"("logicalKey", "revision");
CREATE INDEX "QuestionBankItem_topicId_status_type_idx" ON "QuestionBankItem"("topicId", "status", "type");
CREATE INDEX "QuestionBankItem_subtopicId_status_type_idx" ON "QuestionBankItem"("subtopicId", "status", "type");
CREATE INDEX "QuestionBankItem_provenanceFingerprint_idx" ON "QuestionBankItem"("provenanceFingerprint");
CREATE INDEX "QuestionBankItem_contentFingerprint_idx" ON "QuestionBankItem"("contentFingerprint");
CREATE UNIQUE INDEX "QuestionBankItem_one_published_revision" ON "QuestionBankItem"("logicalKey") WHERE "status" = 'published';
CREATE UNIQUE INDEX "QuestionBankItem_one_draft_revision" ON "QuestionBankItem"("logicalKey") WHERE "status" = 'draft';

ALTER TABLE "PracticeSessionQuestion"
  ALTER COLUMN "examVersionQuestionId" DROP NOT NULL,
  ADD COLUMN "questionBankItemId" TEXT,
  ADD CONSTRAINT "PracticeSessionQuestion_questionBankItemId_fkey"
    FOREIGN KEY ("questionBankItemId") REFERENCES "QuestionBankItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PracticeSessionQuestion_exactly_one_source"
    CHECK ((("examVersionQuestionId" IS NOT NULL)::integer + ("questionBankItemId" IS NOT NULL)::integer) = 1);

DROP INDEX "PracticeSessionQuestion_practiceSessionId_examVersionQuestionId_key";
CREATE UNIQUE INDEX "PracticeSessionQuestion_exam_source_unique"
  ON "PracticeSessionQuestion"("practiceSessionId", "examVersionQuestionId")
  WHERE "examVersionQuestionId" IS NOT NULL;
CREATE UNIQUE INDEX "PracticeSessionQuestion_bank_source_unique"
  ON "PracticeSessionQuestion"("practiceSessionId", "questionBankItemId")
  WHERE "questionBankItemId" IS NOT NULL;
CREATE INDEX "PracticeSessionQuestion_examVersionQuestionId_idx" ON "PracticeSessionQuestion"("examVersionQuestionId");
CREATE INDEX "PracticeSessionQuestion_questionBankItemId_idx" ON "PracticeSessionQuestion"("questionBankItemId");

CREATE OR REPLACE FUNCTION "prevent_immutable_question_bank_item_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'draft' THEN
      RAISE EXCEPTION 'Published or archived question bank items are immutable';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status" = 'archived' THEN
    RAISE EXCEPTION 'Published or archived question bank items are immutable';
  END IF;

  IF OLD."status" = 'published' AND (
    NEW."status" <> 'archived'
    OR (to_jsonb(OLD) - 'status' - 'updatedAt') IS DISTINCT FROM (to_jsonb(NEW) - 'status' - 'updatedAt')
  ) THEN
    RAISE EXCEPTION 'Published question bank items may only be archived';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "QuestionBankItem_immutable"
BEFORE UPDATE OR DELETE ON "QuestionBankItem"
FOR EACH ROW EXECUTE FUNCTION "prevent_immutable_question_bank_item_mutation"();

CREATE OR REPLACE FUNCTION "prevent_immutable_question_bank_batch_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "QuestionBankItem"
    WHERE "importBatchId" = OLD."id" AND "status" <> 'draft'
  ) THEN
    RAISE EXCEPTION 'Question bank batches with published items are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "QuestionBankImportBatch_immutable"
BEFORE UPDATE OR DELETE ON "QuestionBankImportBatch"
FOR EACH ROW EXECUTE FUNCTION "prevent_immutable_question_bank_batch_mutation"();
