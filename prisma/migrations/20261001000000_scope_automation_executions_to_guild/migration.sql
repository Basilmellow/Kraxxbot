-- Preserve tenant ownership and cleanup for rule-less system delivery executions.
ALTER TABLE "AutomationExecution"
ADD CONSTRAINT "AutomationExecution_guildId_fkey"
FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
