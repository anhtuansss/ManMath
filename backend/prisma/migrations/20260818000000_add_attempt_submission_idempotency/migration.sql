-- Durable submit idempotency for V2 exam attempts. Null keeps legacy attempts compatible.
ALTER TABLE "Attempt"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "submissionFingerprint" TEXT;

CREATE UNIQUE INDEX "Attempt_idempotencyKey_key"
ON "Attempt"("idempotencyKey");

CREATE INDEX "Attempt_submissionFingerprint_idx"
ON "Attempt"("submissionFingerprint");
