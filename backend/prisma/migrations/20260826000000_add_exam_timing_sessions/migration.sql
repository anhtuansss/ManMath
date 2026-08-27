CREATE TYPE "ExamTimingSessionStatus" AS ENUM ('in_progress', 'submitted', 'expired');

CREATE TABLE "ExamTimingSession" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "examVersionId" TEXT NOT NULL,
  "userId" TEXT,
  "anonymousTokenHash" TEXT,
  "status" "ExamTimingSessionStatus" NOT NULL DEFAULT 'in_progress',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  CONSTRAINT "ExamTimingSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExamTimingSession_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE,
  CONSTRAINT "ExamTimingSession_examVersionId_fkey" FOREIGN KEY ("examVersionId") REFERENCES "ExamVersion"("id") ON DELETE RESTRICT,
  CONSTRAINT "ExamTimingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ExamTimingSession_identity_check" CHECK (
    ("userId" IS NOT NULL AND "anonymousTokenHash" IS NULL)
    OR ("userId" IS NULL AND "anonymousTokenHash" IS NOT NULL)
  )
);

ALTER TABLE "Attempt" ADD COLUMN "timingSessionId" TEXT;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_timingSessionId_fkey"
  FOREIGN KEY ("timingSessionId") REFERENCES "ExamTimingSession"("id") ON DELETE RESTRICT;

CREATE UNIQUE INDEX "Attempt_timingSessionId_key" ON "Attempt"("timingSessionId");
CREATE INDEX "ExamTimingSession_examId_examVersionId_idx" ON "ExamTimingSession"("examId", "examVersionId");
CREATE INDEX "ExamTimingSession_userId_status_idx" ON "ExamTimingSession"("userId", "status");
CREATE INDEX "ExamTimingSession_expiresAt_idx" ON "ExamTimingSession"("expiresAt");
