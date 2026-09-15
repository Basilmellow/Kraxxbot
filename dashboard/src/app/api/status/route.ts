// KRAXX Operations Platform — Real Telemetry Status API
// Returns live telemetry from BotHeartbeat (45s staleness threshold), database, and Discord API

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchBotUser } from '@/lib/discord';
import { requireAuth } from '@/lib/permissions';

const HEARTBEAT_STALE_THRESHOLD_MS = 45 * 1000; // 45 seconds

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let dbStatus: 'online' | 'offline' = 'offline';
  let discordStatus: 'online' | 'offline' = 'offline';
  let botStatus: 'online' | 'degraded' | 'offline' = 'offline';
  let botDetails: Record<string, any> | null = null;

  // 1. Check Database Connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'online';
  } catch {
    dbStatus = 'offline';
  }

  // 2. Check Discord REST API
  try {
    const botUser = await fetchBotUser();
    discordStatus = 'online';
    botDetails = {
      botId: botUser.id,
      botUsername: botUser.username,
      botAvatar: botUser.avatar,
    };
  } catch {
    discordStatus = 'offline';
  }

  // 3. Check Live Bot Heartbeat from Database
  try {
    const latestHeartbeat = await prisma.botHeartbeat.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (latestHeartbeat) {
      const timeSinceBeat = Date.now() - new Date(latestHeartbeat.updatedAt).getTime();

      if (timeSinceBeat <= HEARTBEAT_STALE_THRESHOLD_MS) {
        botStatus = 'online';
      } else if (timeSinceBeat <= HEARTBEAT_STALE_THRESHOLD_MS * 2) {
        botStatus = 'degraded'; // Missed a couple heartbeats
      } else {
        botStatus = 'offline';
      }

      botDetails = {
        ...botDetails,
        ping: latestHeartbeat.ping,
        uptime: latestHeartbeat.uptime,
        guildCount: latestHeartbeat.guildCount,
        gatewayStatus: latestHeartbeat.gatewayStatus,
        schedulerStatus: latestHeartbeat.schedulerStatus,
        version: latestHeartbeat.version,
        lastHeartbeat: latestHeartbeat.lastHeartbeat.toISOString(),
      };
    } else {
      // If no heartbeat record exists, fallback to Discord API status
      botStatus = discordStatus === 'online' ? 'online' : 'offline';
    }
  } catch {
    // If heartbeat query fails, fallback
    botStatus = discordStatus === 'online' ? 'online' : 'offline';
  }

  return NextResponse.json({
    bot: botStatus,
    database: dbStatus,
    discord: discordStatus,
    telemetry: botDetails,
    lastChecked: new Date().toISOString(),
  });
}
