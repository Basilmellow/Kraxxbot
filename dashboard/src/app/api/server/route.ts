// KRAXX Operations Platform — Server Stats API
// Aggregates statistics from the shared PostgreSQL database

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchGuild } from '@/lib/discord';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error, code: 'TIER_UNAUTHORIZED' }, { status: auth.status });
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
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'CLAIMED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      prisma.ticket.count(),
      prisma.task.count({ where: { status: 'PENDING' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count(),
      prisma.meeting.count({
        where: { status: 'SCHEDULED', startTime: { gte: new Date() } },
      }),
      prisma.meeting.count(),
      prisma.announcement.count(),
      prisma.guildMember.count(),
      prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
    ]);

    // Fetch Discord guild info for live server stats
    let guildData = null;
    try {
      guildData = await fetchGuild();
    } catch {
      // Discord API might be down — continue with DB-only stats
    }

    return NextResponse.json({
      server: {
        memberCount: guildData?.approximate_member_count ?? memberCount,
        onlineCount: guildData?.approximate_presence_count ?? 0,
        name: guildData?.name ?? 'KRAXX HQ',
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
