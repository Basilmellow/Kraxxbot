CREATE TABLE "KraxxAiRequest" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "latencyMs" INTEGER,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KraxxAiRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KraxxAiRequest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "KraxxAiRequest_requestId_key" ON "KraxxAiRequest"("requestId");
CREATE INDEX "KraxxAiRequest_guildId_createdAt_idx" ON "KraxxAiRequest"("guildId", "createdAt");
CREATE INDEX "KraxxAiRequest_guildId_userId_createdAt_idx" ON "KraxxAiRequest"("guildId", "userId", "createdAt");
CREATE INDEX "KraxxAiRequest_guildId_status_createdAt_idx" ON "KraxxAiRequest"("guildId", "status", "createdAt");

INSERT INTO "GuildModule" ("id", "guildId", "module", "enabled", "updatedAt")
SELECT 'kraxx-ai_' || "id", "id", 'kraxx-ai', false, CURRENT_TIMESTAMP FROM "Guild"
ON CONFLICT ("guildId", "module") DO NOTHING;
