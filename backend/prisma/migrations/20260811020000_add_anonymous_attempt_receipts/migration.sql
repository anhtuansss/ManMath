-- Anonymous attempts can recover only a safe receipt using a seven-day token.
-- The database stores a one-way hash, never the raw credential.
ALTER TABLE "Attempt"
ADD COLUMN "anonymousReceiptTokenHash" TEXT,
ADD COLUMN "anonymousReceiptExpiresAt" TIMESTAMP(3);

CREATE INDEX "Attempt_anonymousReceiptExpiresAt_idx"
ON "Attempt"("anonymousReceiptExpiresAt");
