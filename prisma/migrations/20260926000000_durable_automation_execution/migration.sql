-- Persist automation event deliveries with idempotency and recoverable worker leases.
CREATE UNIQUE INDEX "AutomationRule_id_guildId_key" ON "AutomationRule"("id", "guildId");

CREATE TABLE "AutomationExecution" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventData" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationExecution_idempotencyKey_key" ON "AutomationExecution"("idempotencyKey");
CREATE UNIQUE INDEX "AutomationExecution_ruleId_eventId_key" ON "AutomationExecution"("ruleId", "eventId");
CREATE INDEX "AutomationExecution_status_nextAttemptAt_idx" ON "AutomationExecution"("status", "nextAttemptAt");
CREATE INDEX "AutomationExecution_status_leaseExpiresAt_idx" ON "AutomationExecution"("status", "leaseExpiresAt");
CREATE INDEX "AutomationExecution_guildId_status_idx" ON "AutomationExecution"("guildId", "status");

ALTER TABLE "AutomationExecution"
ADD CONSTRAINT "AutomationExecution_ruleId_guildId_fkey"
FOREIGN KEY ("ruleId", "guildId") REFERENCES "AutomationRule"("id", "guildId")
ON DELETE CASCADE ON UPDATE CASCADE;
