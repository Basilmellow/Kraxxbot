-- Persist delivery attempts and expiring worker leases so scheduled work can
-- recover after a process restart. Existing records are backfilled before the
-- idempotency key is made required.
ALTER TABLE "Reminder"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "Reminder" SET "idempotencyKey" = "id" WHERE "idempotencyKey" IS NULL;
ALTER TABLE "Reminder" ALTER COLUMN "idempotencyKey" SET NOT NULL;

ALTER TABLE "ScheduledAnnouncement"
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "ScheduledAnnouncement" SET "idempotencyKey" = "id" WHERE "idempotencyKey" IS NULL;
ALTER TABLE "ScheduledAnnouncement" ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "Reminder_idempotencyKey_key" ON "Reminder"("idempotencyKey");
CREATE INDEX "Reminder_status_nextAttemptAt_idx" ON "Reminder"("status", "nextAttemptAt");
CREATE INDEX "Reminder_status_leaseExpiresAt_idx" ON "Reminder"("status", "leaseExpiresAt");
CREATE UNIQUE INDEX "ScheduledAnnouncement_idempotencyKey_key" ON "ScheduledAnnouncement"("idempotencyKey");
CREATE INDEX "ScheduledAnnouncement_status_nextAttemptAt_idx" ON "ScheduledAnnouncement"("status", "nextAttemptAt");
CREATE INDEX "ScheduledAnnouncement_status_leaseExpiresAt_idx" ON "ScheduledAnnouncement"("status", "leaseExpiresAt");
