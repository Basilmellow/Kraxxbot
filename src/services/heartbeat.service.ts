import { Client } from 'discord.js';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';

const HEARTBEAT_INTERVAL_MS = 20_000; // 20 seconds

let heartbeatTimer: NodeJS.Timeout | null = null;
let startTime: number = Date.now();

/**
 * Writes a real-time heartbeat record to the database.
 * Captures: gateway ping, uptime, guild count, and connection status.
 */
async function writeHeartbeat(client: Client): Promise<void> {
  try {
    const pingMs = client.ws.ping;
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const guildCount = client.guilds.cache.size;
    const gatewayStatus = client.ws.status === 0 ? 'CONNECTED' : 'RECONNECTING';

    await prisma.botHeartbeat.upsert({
      where: { id: 'singleton' },
      update: {
        status: 'ONLINE',
        gatewayStatus,
        ping: pingMs,
        uptime: uptimeSeconds,
        guildCount,
        lastHeartbeat: new Date(),
      },
      create: {
        id: 'singleton',
        status: 'ONLINE',
        gatewayStatus,
        ping: pingMs,
        uptime: uptimeSeconds,
        guildCount,
        lastHeartbeat: new Date(),
      },
    });
  } catch (error) {
    // Never crash the bot due to a failed heartbeat write
    logger.warn({ err: error }, '⚠️ Heartbeat write failed — bot is still running');
  }
}

/**
 * Marks the bot as offline in the heartbeat record.
 * Called on SIGTERM / SIGINT before process exits.
 */
async function markOffline(): Promise<void> {
  try {
    await prisma.botHeartbeat.updateMany({
      where: { id: 'singleton' },
      data: { status: 'OFFLINE', gatewayStatus: 'DISCONNECTED', lastHeartbeat: new Date() },
    });
  } catch (_) {
    // Best-effort
  }
}

export const HeartbeatService = {
  /**
   * Starts the periodic heartbeat writer. Call once after client.login().
   */
  start(client: Client): void {
    if (heartbeatTimer) return; // Already running
    startTime = Date.now();

    // Write initial heartbeat immediately on start
    writeHeartbeat(client);

    heartbeatTimer = setInterval(() => {
      writeHeartbeat(client);
    }, HEARTBEAT_INTERVAL_MS);

    logger.info(`💓 Heartbeat service started (interval: ${HEARTBEAT_INTERVAL_MS / 1000}s)`);

    // Register shutdown hooks to mark bot offline cleanly
    const shutdown = async () => {
      logger.info('🛑 Heartbeat service shutting down — marking bot offline...');
      HeartbeatService.stop();
      await markOffline();
    };

    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  },

  /**
   * Stops the heartbeat timer.
   */
  stop(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  },
};
