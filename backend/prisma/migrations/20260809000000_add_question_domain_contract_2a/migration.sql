-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single_choice', 'true_false_group', 'short_answer');

-- AlterTable
ALTER TABLE "Question"
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "type" "QuestionType" NOT NULL DEFAULT 'single_choice',
  ADD COLUMN "section" INTEGER,
  ADD COLUMN "assets" JSONB,
  ADD COLUMN "choices" JSONB,
  ADD COLUMN "statements" JSONB,
  ADD COLUMN "answerKey" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Question_examId_externalId_key" ON "Question"("examId", "externalId");

-- CreateIndex
CREATE INDEX "Question_examId_type_idx" ON "Question"("examId", "type");
