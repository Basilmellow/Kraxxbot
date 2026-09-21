import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const guildId = request.nextUrl.searchParams.get('guildId') || process.env.GUILD_ID || '';
    const guildFilter = guildId ? { guildId } : {};

    const [
      totalTickets,
      openTickets,
      claimedTickets,
      closedTickets,
      totalTasks,
      completedTasks,
      inProgressTasks,
      totalMeetings,
      totalAuditLogs,
      modLogs,
      activeReminders,
    ] = await Promise.all([
      prisma.ticket.count({ where: guildFilter }),
      prisma.ticket.count({ where: { ...guildFilter, status: 'OPEN' } }),
      prisma.ticket.count({ where: { ...guildFilter, status: 'CLAIMED' } }),
      prisma.ticket.count({ where: { ...guildFilter, status: 'CLOSED' } }),
      prisma.task.count({ where: guildFilter }),
      prisma.task.count({ where: { ...guildFilter, status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...guildFilter, status: 'IN_PROGRESS' } }),
      prisma.meeting.count({ where: guildFilter }),
      prisma.dashboardAuditLog.count({ where: guildFilter }),
      prisma.moderationCase.findMany({ where: guildFilter, take: 100 }),
      prisma.reminder.count({ where: { ...guildFilter, status: 'ACTIVE' } }),
    ]);

    // Breakdown moderation actions
    const modBreakdown: Record<string, number> = { WARN: 0, TIMEOUT: 0, KICK: 0, BAN: 0, UNBAN: 0 };
    modLogs.forEach((l: { action: string }) => {
      if (modBreakdown[l.action] !== undefined) modBreakdown[l.action]++;
    });

    return NextResponse.json({
      tickets: { total: totalTickets, open: openTickets, claimed: claimedTickets, closed: closedTickets },
      tasks: { total: totalTasks, completed: completedTasks, inProgress: inProgressTasks },
      meetings: { total: totalMeetings },
      reminders: { active: activeReminders },
      audit: { total: totalAuditLogs },
      moderation: modBreakdown,
    });
  } catch (error: any) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}
