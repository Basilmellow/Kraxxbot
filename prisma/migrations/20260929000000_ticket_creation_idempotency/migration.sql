ALTER TABLE "Ticket" ADD COLUMN "creationKey" TEXT;

CREATE UNIQUE INDEX "Ticket_guildId_creationKey_key" ON "Ticket"("guildId", "creationKey");
