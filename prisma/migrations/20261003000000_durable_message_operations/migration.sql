CREATE TABLE "MessageOperation" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "targetMessageId" TEXT,
  "discordMessageId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageOperation_guildId_idempotencyKey_key"
ON "MessageOperation"("guildId", "idempotencyKey");

CREATE INDEX "MessageOperation_guildId_status_createdAt_idx"
ON "MessageOperation"("guildId", "status", "createdAt");

ALTER TABLE "MessageOperation"
ADD CONSTRAINT "MessageOperation_guildId_fkey"
FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
