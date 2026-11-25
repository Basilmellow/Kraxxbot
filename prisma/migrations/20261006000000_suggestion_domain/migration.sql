ALTER TABLE "Suggestion"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "channelId" TEXT,
  ADD COLUMN "messageId" TEXT,
  ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
  ADD COLUMN "messageSyncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
  ADD COLUMN "messageSyncKey" TEXT,
  ADD COLUMN "reviewerId" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Suggestion_guildId_idempotencyKey_key"
  ON "Suggestion"("guildId", "idempotencyKey");
