import { logDashboardAction } from '@/lib/audit';
import { authOptions } from '@/lib/auth';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const { id: reminderId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const reminder = await prisma.reminder.update({
      where: { id: reminderId, guildId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    await logDashboardAction({
      guildId,
      action: 'REMINDER_CANCEL',
      executorId: currentUserId,
      targetId: reminderId,
      targetType: 'REMINDER',
      details: { title: reminder.title },
    });

    return NextResponse.json({ success: true, message: 'Reminder cancelled.' });
  } catch (error: unknown) {
    console.error('Failed to cancel reminder:', error);
    return NextResponse.json({ error: 'Failed to cancel reminder' }, { status: 500 });
  }
}

export const DELETE = withMutation('MANAGE_SETTINGS', handleDELETE);
