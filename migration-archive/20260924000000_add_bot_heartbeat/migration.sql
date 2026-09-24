-- CreateTable
CREATE TABLE "BotHeartbeat" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "gatewayStatus" TEXT NOT NULL DEFAULT 'CONNECTED',
    "ping" INTEGER NOT NULL DEFAULT 0,
    "uptime" INTEGER NOT NULL DEFAULT 0,
    "guildCount" INTEGER NOT NULL DEFAULT 0,
    "schedulerStatus" TEXT NOT NULL DEFAULT 'RUNNING',
    "version" TEXT NOT NULL DEFAULT '2.0.0',
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotHeartbeat_pkey" PRIMARY KEY ("id")
);
