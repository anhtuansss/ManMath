-- CreateEnum
CREATE TYPE "AttemptScoringPolicy" AS ENUM ('vietnam_thpt_math_2025');

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "maxScoreUnits" INTEGER,
ADD COLUMN     "scoreUnits" INTEGER,
ADD COLUMN     "scoringPolicy" "AttemptScoringPolicy";

-- AlterTable
ALTER TABLE "AttemptAnswer" ADD COLUMN     "awardedScoreUnits" INTEGER,
ADD COLUMN     "isFullyCorrect" BOOLEAN,
ADD COLUMN     "maxScoreUnits" INTEGER,
ADD COLUMN     "questionExternalId" TEXT,
ADD COLUMN     "questionType" "QuestionType",
ADD COLUMN     "response" JSONB,
ALTER COLUMN "correctOptionIndex" DROP NOT NULL;
