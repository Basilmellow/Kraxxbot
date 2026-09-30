ALTER TABLE "Poll"
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "closedBy" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "requestHash" TEXT,
  ADD COLUMN "messageSyncStatus" TEXT NOT NULL DEFAULT 'SYNCED';

CREATE UNIQUE INDEX "Poll_id_guildId_key" ON "Poll"("id", "guildId");
CREATE UNIQUE INDEX "Poll_guildId_idempotencyKey_key" ON "Poll"("guildId", "idempotencyKey");
CREATE INDEX "Poll_status_expiresAt_idx" ON "Poll"("status", "expiresAt");

ALTER TABLE "Poll" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE TABLE "PollVote" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "optionIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PollVote_pollId_userId_key" ON "PollVote"("pollId", "userId");
CREATE INDEX "PollVote_guildId_pollId_idx" ON "PollVote"("guildId", "pollId");

ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_guildId_fkey"
  FOREIGN KEY ("pollId", "guildId") REFERENCES "Poll"("id", "guildId") ON DELETE CASCADE ON UPDATE CASCADE;
