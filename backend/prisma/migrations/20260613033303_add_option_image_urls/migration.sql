-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "optionImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
