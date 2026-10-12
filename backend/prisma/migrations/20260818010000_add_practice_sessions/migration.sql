CREATE TYPE "PracticeSessionStatus" AS ENUM ('in_progress', 'completed');

CREATE TABLE "PracticeSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "status" "PracticeSessionStatus" NOT NULL DEFAULT 'in_progress',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "scoreUnits" INTEGER,
  "maxScoreUnits" INTEGER,
  "fullyCorrectCount" INTEGER,
  "totalQuestions" INTEGER NOT NULL,
  "unansweredCount" INTEGER,
  "submitIdempotencyKey" TEXT,
  "submissionFingerprint" TEXT,
  CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "PracticeSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT
);

CREATE TABLE "PracticeSessionQuestion" (
  "id" TEXT NOT NULL,
  "practiceSessionId" TEXT NOT NULL,
  "examVersionQuestionId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  CONSTRAINT "PracticeSessionQuestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PracticeSessionQuestion_practiceSessionId_fkey" FOREIGN KEY ("practiceSessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE,
  CONSTRAINT "PracticeSessionQuestion_examVersionQuestionId_fkey" FOREIGN KEY ("examVersionQuestionId") REFERENCES "ExamVersionQuestion"("id") ON DELETE RESTRICT
);

CREATE TABLE "PracticeSessionAnswer" (
  "id" TEXT NOT NULL,
  "practiceSessionQuestionId" TEXT NOT NULL,
  "response" JSONB,
  "responseRevision" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "isFullyCorrect" BOOLEAN,
  "awardedScoreUnits" INTEGER,
  "maxScoreUnits" INTEGER,
  CONSTRAINT "PracticeSessionAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PracticeSessionAnswer_practiceSessionQuestionId_fkey" FOREIGN KEY ("practiceSessionQuestionId") REFERENCES "PracticeSessionQuestion"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PracticeSession_submitIdempotencyKey_key" ON "PracticeSession"("submitIdempotencyKey");
CREATE UNIQUE INDEX "PracticeSessionQuestion_practiceSessionId_order_key" ON "PracticeSessionQuestion"("practiceSessionId", "order");
CREATE UNIQUE INDEX "PracticeSessionQuestion_practiceSessionId_examVersionQuestionId_key" ON "PracticeSessionQuestion"("practiceSessionId", "examVersionQuestionId");
CREATE UNIQUE INDEX "PracticeSessionAnswer_practiceSessionQuestionId_key" ON "PracticeSessionAnswer"("practiceSessionQuestionId");
CREATE UNIQUE INDEX "PracticeSession_one_in_progress_per_topic" ON "PracticeSession"("userId", "topicId") WHERE "status" = 'in_progress';
CREATE INDEX "PracticeSession_userId_status_idx" ON "PracticeSession"("userId", "status");
CREATE INDEX "PracticeSession_topicId_status_idx" ON "PracticeSession"("topicId", "status");

CREATE OR REPLACE FUNCTION "prevent_practice_session_question_mutation"()
RETURNS TRIGGER AS $$ BEGIN
  RAISE EXCEPTION 'Practice session membership is immutable';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "PracticeSessionQuestion_immutable"
BEFORE UPDATE OR DELETE ON "PracticeSessionQuestion"
FOR EACH ROW EXECUTE FUNCTION "prevent_practice_session_question_mutation"();

CREATE OR REPLACE FUNCTION "prevent_completed_practice_session_mutation"()
RETURNS TRIGGER AS $$ BEGIN
  IF OLD."status" = 'completed' THEN
    RAISE EXCEPTION 'Completed practice sessions are immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "PracticeSession_completed_immutable"
BEFORE UPDATE ON "PracticeSession"
FOR EACH ROW EXECUTE FUNCTION "prevent_completed_practice_session_mutation"();

CREATE OR REPLACE FUNCTION "prevent_completed_practice_answer_mutation"()
RETURNS TRIGGER AS $$ DECLARE state "PracticeSessionStatus"; BEGIN
  SELECT "status" INTO state FROM "PracticeSessionQuestion" q JOIN "PracticeSession" s ON s."id" = q."practiceSessionId" WHERE q."id" = OLD."practiceSessionQuestionId";
  IF state = 'completed' THEN RAISE EXCEPTION 'Completed practice answers are immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "PracticeSessionAnswer_completed_immutable"
BEFORE UPDATE OR DELETE ON "PracticeSessionAnswer"
FOR EACH ROW EXECUTE FUNCTION "prevent_completed_practice_answer_mutation"();
