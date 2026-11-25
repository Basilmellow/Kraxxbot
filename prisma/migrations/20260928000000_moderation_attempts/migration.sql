ALTER TABLE "ModerationCase"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SUCCESS',
ADD COLUMN "requestKey" TEXT,
ADD COLUMN "requestHash" TEXT,
ADD COLUMN "details" TEXT,
ADD COLUMN "errorCode" TEXT;
CREATE UNIQUE INDEX "ModerationCase_guildId_requestKey_key" ON "ModerationCase"("guildId", "requestKey");
CREATE INDEX "ModerationCase_guildId_targetId_status_idx" ON "ModerationCase"("guildId", "targetId", "status");
