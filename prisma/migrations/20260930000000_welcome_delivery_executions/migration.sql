-- Allow the existing leased automation worker to also own system welcome deliveries.
ALTER TABLE "AutomationExecution" ALTER COLUMN "ruleId" DROP NOT NULL;
