// KRAXX Operations Platform — Server Stats API
// Aggregates statistics from the shared PostgreSQL database

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGuild } from '@/lib/discord';
import { requireGuildAccess } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason, code: 'UNAUTHORIZED' }, { status: auth.status });
  }

  try {
    // Parallel database queries for efficiency
    const [
      ticketOpenCount,
      ticketClaimedCount,
      ticketClosedCount,
      ticketTotal,
      taskPendingCount,
      taskInProgressCount,
      taskCompletedCount,
      taskTotal,
      upcomingMeetings,
      meetingTotal,
      announcementCount,
      memberCount,
      recentAudit,
    ] = await Promise.all([
      prisma.ticket.count({ where: { guildId, status: 'OPEN' } }),
      prisma.ticket.count({ where: { guildId, status: 'CLAIMED' } }),
      prisma.ticket.count({ where: { guildId, status: 'CLOSED' } }),
      prisma.ticket.count({ where: { guildId } }),
      prisma.task.count({ where: { guildId, status: 'PENDING' } }),
      prisma.task.count({ where: { guildId, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { guildId, status: 'COMPLETED' } }),
      prisma.task.count({ where: { guildId } }),
      prisma.meeting.count({
        where: { guildId, status: 'SCHEDULED', startTime: { gte: new Date() } },
      }),
      prisma.meeting.count({ where: { guildId } }),
      prisma.announcement.count({ where: { guildId } }),
      prisma.guildMember.count({ where: { guildId } }),
      prisma.auditLog.findMany({
        where: { guildId },
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
    ]);

    // Fetch Discord guild info for live server stats
    let guildData = null;
    try {
      guildData = await fetchGuild(guildId);
    } catch {
      // Discord API might be down — continue with DB-only stats
    }

    return NextResponse.json({
      server: {
        memberCount: guildData?.approximate_member_count ?? memberCount,
        onlineCount: guildData?.approximate_presence_count ?? 0,
        name: guildData?.name ?? 'Discord Server',
        icon: guildData?.icon
          ? `https://cdn.discordapp.com/icons/${guildData.id}/${guildData.icon}.webp?size=128`
          : null,
      },
      tickets: {
        open: ticketOpenCount,
        claimed: ticketClaimedCount,
        closed: ticketClosedCount,
        total: ticketTotal,
      },
      tasks: {
        pending: taskPendingCount,
        inProgress: taskInProgressCount,
        completed: taskCompletedCount,
        total: taskTotal,
      },
      meetings: {
        upcoming: upcomingMeetings,
        total: meetingTotal,
      },
      announcements: announcementCount,
      registeredMembers: memberCount,
      recentActivity: recentAudit.map((log: { id: string; action: string; executorId: string; targetId: string | null; details: string | null; timestamp: Date }) => ({
        id: log.id,
        action: log.action,
        executorId: log.executorId,
        targetId: log.targetId,
        details: log.details,
        timestamp: log.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[API] Server stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server statistics' },
      { status: 500 }
    );
  }
}
