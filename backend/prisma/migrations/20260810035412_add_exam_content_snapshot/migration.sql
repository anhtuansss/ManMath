-- AlterTable
ALTER TABLE "Attempt" 
ADD COLUMN     "contentSnapshotVersion" INTEGER,
ADD COLUMN     "examContentSnapshot" JSONB;
