// KRAXX Operations Platform — Per-Guild Status & Health API
// Provides telemetry, active modules, and quick stats for a specific server tenant

import { NextRequest, NextResponse } from 'next/server';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { fetchGuildById } from '@/lib/discord';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const auth = await requireGuildAccess(guildId);

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // 1. Fetch DB Guild and settings
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        settings: true,
        modules: true,
      },
    });

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    // 2. Fetch live Discord guild data (approximate counts, icon, name)
    let discordData: any = null;
    try {
      discordData = await fetchGuildById(guildId);
    } catch {
      // Discord API call might fail if bot token is rate limited or server unavailable
    }

    // 3. Fetch Quick Stats for this server
    const [ticketCount, reminderCount, scheduledCount] = await Promise.all([
      prisma.ticket.count({
        where: { guildId, status: { not: 'CLOSED' } },
      }).catch(() => 0),
      prisma.reminder.count({
        where: { guildId, status: 'ACTIVE' },
      }).catch(() => 0),
      prisma.scheduledAnnouncement.count({
        where: { guildId, status: 'PENDING' },
      }).catch(() => 0),
    ]);

    // 4. Check Bot Heartbeat
    const heartbeat = await prisma.botHeartbeat.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const isBotLive = heartbeat
      ? Date.now() - new Date(heartbeat.updatedAt).getTime() <= 45000
      : false;

    return NextResponse.json({
      guild: {
        id: guild.id,
        name: discordData?.name || guild.name,
        icon: discordData?.icon || guild.icon,
        ownerId: guild.ownerId,
        botInstalled: guild.botInstalled,
        memberCount: discordData?.approximate_member_count || 0,
        presenceCount: discordData?.approximate_presence_count || 0,
      },
      bot: {
        status: isBotLive ? 'online' : 'offline',
        ping: heartbeat?.ping ?? null,
        uptime: heartbeat?.uptime ?? null,
      },
      modules: guild.modules.map((m) => ({
        module: m.module,
        enabled: m.enabled,
      })),
      stats: {
        activeTickets: ticketCount,
        pendingReminders: reminderCount,
        pendingAnnouncements: scheduledCount,
      },
    });
  } catch (error: any) {
    console.error(`[Guild Status API] Error for guild ${guildId}:`, error);
    return NextResponse.json(
      { error: 'Internal Server Error: ' + (error?.message || 'Failed to fetch status') },
      { status: 500 }
    );
  }
}
