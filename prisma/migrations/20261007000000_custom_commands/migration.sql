CREATE TABLE "CustomCommand" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "normalizedTrigger" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "cooldownSeconds" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomCommand_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomCommand_guildId_id_key" UNIQUE ("guildId", "id"),
  CONSTRAINT "CustomCommand_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CustomCommandUse" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "customCommandId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastExecutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomCommandUse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomCommandUse_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CustomCommandUse_guildId_customCommandId_fkey" FOREIGN KEY ("guildId", "customCommandId") REFERENCES "CustomCommand"("guildId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CustomCommand_guildId_normalizedTrigger_key" ON "CustomCommand"("guildId", "normalizedTrigger");
CREATE INDEX "CustomCommand_guildId_enabled_idx" ON "CustomCommand"("guildId", "enabled");
CREATE UNIQUE INDEX "CustomCommandUse_guildId_customCommandId_userId_key" ON "CustomCommandUse"("guildId", "customCommandId", "userId");
CREATE INDEX "CustomCommandUse_guildId_lastExecutedAt_idx" ON "CustomCommandUse"("guildId", "lastExecutedAt");

INSERT INTO "GuildModule" ("id", "guildId", "module", "enabled", "updatedAt")
SELECT 'customCommands_' || "id", "id", 'customCommands', true, CURRENT_TIMESTAMP FROM "Guild"
ON CONFLICT ("guildId", "module") DO NOTHING;
