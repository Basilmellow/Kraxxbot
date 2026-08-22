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

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const parsedNumber = parseInt(q, 10);
  const isNumber = !isNaN(parsedNumber);

  try {
    const ticketOrs: any[] = [{ openerId: { contains: q } }];
    if (isNumber) {
      ticketOrs.push({ ticketNumber: parsedNumber });
    }

    const [tickets, tasks, meetings, reminders, auditLogs] = await Promise.all([
      prisma.ticket.findMany({
        where: {
          OR: ticketOrs,
        },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.meeting.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { agenda: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.reminder.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { message: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.dashboardAuditLog.findMany({
        where: {
          OR: [
            { action: { contains: q, mode: 'insensitive' } },
            { executorId: { contains: q } },
            { targetId: { contains: q } },
          ],
        },
        take: 5,
      }),
    ]);

    const results = [
      ...tickets.map((t) => ({
        type: 'TICKET',
        id: t.id,
        title: `Ticket #${t.ticketNumber}`,
        subtitle: `Status: ${t.status} • Opener: ${t.openerId}`,
        url: `/dashboard/tickets`,
      })),
      ...tasks.map((t) => ({
        type: 'TASK',
        id: t.id,
        title: `Task #${t.taskNumber}: ${t.title}`,
        subtitle: `Status: ${t.status} • Priority: ${t.priority}`,
        url: `/dashboard/tasks`,
      })),
      ...meetings.map((m) => ({
        type: 'MEETING',
        id: m.id,
        title: `Meeting: ${m.title}`,
        subtitle: `Time: ${new Date(m.startTime).toLocaleString()} • Status: ${m.status}`,
        url: `/dashboard/meetings`,
      })),
      ...reminders.map((r) => ({
        type: 'REMINDER',
        id: r.id,
        title: `Reminder: ${r.title}`,
        subtitle: `Status: ${r.status} • Target: ${r.targetType}`,
        url: `/dashboard/reminders`,
      })),
      ...auditLogs.map((a) => ({
        type: 'AUDIT',
        id: a.id,
        title: `Audit Action: ${a.action}`,
        subtitle: `By: ${a.executorId} • ${new Date(a.timestamp).toLocaleString()}`,
        url: `/dashboard/audit`,
      })),
    ];

    return NextResponse.json({ results, total: results.length });
  } catch (error: any) {
    console.error('Failed to execute search:', error);
    return NextResponse.json({ error: error.message || 'Failed to search' }, { status: 500 });
  }
}
