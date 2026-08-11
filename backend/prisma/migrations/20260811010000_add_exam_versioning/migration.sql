-- Immutable V2 content lives in a versioned table. Existing legacy/V2 rows
-- remain readable because this migration only adds nullable linkage fields.
CREATE TYPE "ExamVersionStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "ExamPublishProfile" AS ENUM ('official_full_exam', 'practice');

ALTER TABLE "Attempt"
ADD COLUMN "examVersionId" TEXT;

CREATE TABLE "ExamVersion" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "ExamVersionStatus" NOT NULL DEFAULT 'draft',
  "publishProfile" "ExamPublishProfile" NOT NULL DEFAULT 'practice',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "difficulty" "ExamDifficulty" NOT NULL,
  "source" TEXT,
  "year" INTEGER,
  "statusLabel" TEXT NOT NULL,
  "scoringPolicy" "AttemptScoringPolicy" NOT NULL DEFAULT 'vietnam_thpt_math_2025',
  "contentChecksum" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamVersionQuestion" (
  "id" TEXT NOT NULL,
  "examVersionId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "type" "QuestionType" NOT NULL,
  "section" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "topicSlug" TEXT NOT NULL,
  "topicName" TEXT NOT NULL,
  "subtopicSlug" TEXT,
  "subtopicName" TEXT,
  "assets" JSONB,
  "choices" JSONB,
  "statements" JSONB,
  "answerKey" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamVersionQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamVersion_examId_versionNumber_key" ON "ExamVersion"("examId", "versionNumber");
CREATE INDEX "ExamVersion_examId_status_idx" ON "ExamVersion"("examId", "status");
CREATE UNIQUE INDEX "ExamVersionQuestion_examVersionId_externalId_key" ON "ExamVersionQuestion"("examVersionId", "externalId");
CREATE UNIQUE INDEX "ExamVersionQuestion_examVersionId_order_key" ON "ExamVersionQuestion"("examVersionId", "order");
CREATE INDEX "ExamVersionQuestion_examVersionId_type_idx" ON "ExamVersionQuestion"("examVersionId", "type");
CREATE INDEX "ExamVersionQuestion_topicSlug_idx" ON "ExamVersionQuestion"("topicSlug");
CREATE INDEX "ExamVersionQuestion_subtopicSlug_idx" ON "ExamVersionQuestion"("subtopicSlug");
CREATE INDEX "Attempt_examVersionId_idx" ON "Attempt"("examVersionId");

ALTER TABLE "Attempt"
ADD CONSTRAINT "Attempt_examVersionId_fkey"
FOREIGN KEY ("examVersionId") REFERENCES "ExamVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExamVersion"
ADD CONSTRAINT "ExamVersion_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExamVersionQuestion"
ADD CONSTRAINT "ExamVersionQuestion_examVersionId_fkey"
FOREIGN KEY ("examVersionId") REFERENCES "ExamVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
