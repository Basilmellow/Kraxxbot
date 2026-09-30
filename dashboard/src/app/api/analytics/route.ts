import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextRequest,NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const access = await requireGuildAccess(guildId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const guildFilter = { guildId };

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
      prisma.moderationCase.findMany({ where: { ...guildFilter, status: 'SUCCESS' }, take: 100 }),
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
  } catch {
    console.error('Failed to fetch analytics.');
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
