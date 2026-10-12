-- AlterTable
ALTER TABLE "Question"
  ALTER COLUMN "options" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Question"
  ALTER COLUMN "correctAnswer" DROP NOT NULL;
