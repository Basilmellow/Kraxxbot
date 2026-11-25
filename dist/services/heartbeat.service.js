"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartbeatService = void 0;
const client_1 = require("../database/client");
const logger_1 = require("../utils/logger");
const scheduler_service_1 = require("./scheduler.service");
const gemini_provider_1 = require("./gemini.provider");
const HEARTBEAT_INTERVAL_MS = 20_000; // 20 seconds
let heartbeatTimer = null;
let startTime = Date.now();
/**
 * Writes a real-time heartbeat record to the database.
 * Captures: gateway ping, uptime, guild count, and connection status.
 */
async function writeHeartbeat(client) {
    try {
        const pingMs = client.ws.ping;
        const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
        const guildCount = client.guilds.cache.size;
        const gatewayStatus = client.ws.status === 0 ? 'CONNECTED' : 'RECONNECTING';
        await client_1.prisma.botHeartbeat.upsert({
            where: { id: 'singleton' },
            update: {
                status: client.isReady() ? 'ONLINE' : 'DEGRADED',
                schedulerStatus: scheduler_service_1.SchedulerService.health(),
                gatewayStatus,
                ping: pingMs,
                uptime: uptimeSeconds,
                guildCount,
                aiProviderStatus: process.env.GEMINI_API_KEY?.trim() ? 'CONFIGURED' : 'MISSING_CONFIGURATION',
                aiModel: gemini_provider_1.GEMINI_MODEL,
                lastHeartbeat: new Date(),
            },
            create: {
                id: 'singleton',
                status: client.isReady() ? 'ONLINE' : 'DEGRADED',
                schedulerStatus: scheduler_service_1.SchedulerService.health(),
                gatewayStatus,
                ping: pingMs,
                uptime: uptimeSeconds,
                guildCount,
                aiProviderStatus: process.env.GEMINI_API_KEY?.trim() ? 'CONFIGURED' : 'MISSING_CONFIGURATION',
                aiModel: gemini_provider_1.GEMINI_MODEL,
                lastHeartbeat: new Date(),
            },
        });
    }
    catch (error) {
        // Never crash the bot due to a failed heartbeat write
        logger_1.logger.warn({ err: error }, '⚠️ Heartbeat write failed — bot is still running');
    }
}
/**
 * Marks the bot as offline in the heartbeat record.
 * Called on SIGTERM / SIGINT before process exits.
 */
async function markOffline() {
    try {
        await client_1.prisma.botHeartbeat.updateMany({
            where: { id: 'singleton' },
            data: { status: 'OFFLINE', gatewayStatus: 'DISCONNECTED', lastHeartbeat: new Date() },
        });
    }
    catch (_) {
        // Best-effort
    }
}
exports.HeartbeatService = {
    /**
     * Starts the periodic heartbeat writer. Call once after client.login().
     */
    start(client) {
        if (heartbeatTimer)
            return; // Already running
        startTime = Date.now();
        // Write initial heartbeat immediately on start
        writeHeartbeat(client);
        heartbeatTimer = setInterval(() => {
            writeHeartbeat(client);
        }, HEARTBEAT_INTERVAL_MS);
        logger_1.logger.info(`💓 Heartbeat service started (interval: ${HEARTBEAT_INTERVAL_MS / 1000}s)`);
        // Register shutdown hooks to mark bot offline cleanly
        const shutdown = async () => {
            logger_1.logger.info('🛑 Heartbeat service shutting down — marking bot offline...');
            exports.HeartbeatService.stop();
            await markOffline();
        };
        process.once('SIGTERM', shutdown);
        process.once('SIGINT', shutdown);
    },
    /**
     * Stops the heartbeat timer.
     */
    stop() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    },
};
