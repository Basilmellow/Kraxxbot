import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.STAFF);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
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
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'CLAIMED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.meeting.count(),
      prisma.dashboardAuditLog.count(),
      prisma.moderationLog.findMany({ take: 100 }),
      prisma.reminder.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Breakdown moderation actions
    const modBreakdown: Record<string, number> = { WARN: 0, TIMEOUT: 0, KICK: 0, BAN: 0, UNBAN: 0 };
    modLogs.forEach((l) => {
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
