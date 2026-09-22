import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier, requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || '';
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  }

  try {
    const whereClause: any = { guildId };
    if (statusFilter && statusFilter !== 'ALL') whereClause.status = statusFilter;

    const reminders = await prisma.reminder.findMany({
      where: whereClause,
      orderBy: { triggerAt: 'asc' },
      take: 100,
    });

    return NextResponse.json({ reminders, total: reminders.length });
  } catch (error: any) {
    console.error('Failed to fetch reminders:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, targetType = 'CHANNEL', targetId, triggerAt, recurrence = 'NONE', guildId: bodyGuildId } = body;
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const auth = await requireGuildAccess(guildId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
    }

    if (!title || !message || !targetId || !triggerAt) {
      return NextResponse.json({ error: 'Title, message, target ID, and trigger time are required.' }, { status: 400 });
    }

    const currentUserId = auth.session!.user.discordId;
    const triggerDate = new Date(triggerAt);
    if (isNaN(triggerDate.getTime()) || triggerDate <= new Date()) {
      return NextResponse.json({ error: 'Reminder trigger time must be in the future.' }, { status: 400 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        guildId,
        title: title.trim(),
        message: message.trim(),
        targetType,
        targetId,
        triggerAt: triggerDate,
        isRecurring: recurrence !== 'NONE',
        cronPattern: recurrence === 'DAILY' ? '0 0 * * *' : recurrence === 'WEEKLY' ? '0 0 * * 0' : recurrence === 'MONTHLY' ? '0 0 1 * *' : null,
        status: 'ACTIVE',
        createdBy: currentUserId,
      },
    });

    await logDashboardAction({
      guildId,
      action: 'REMINDER_CREATE',
      executorId: currentUserId,
      targetId: reminder.id,
      targetType: 'REMINDER',
      details: { title: reminder.title, targetType, targetId, triggerAt },
    });

    return NextResponse.json({ success: true, reminder });
  } catch (error: any) {
    console.error('Failed to create reminder:', error);
    return NextResponse.json({ error: error.message || 'Failed to create reminder' }, { status: 500 });
  }
}
