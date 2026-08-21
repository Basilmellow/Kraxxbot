import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.STAFF);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: reminderId } = await params;
  const currentUserId = session!.user.discordId;

  try {
    const reminder = await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: 'CANCELLED' },
    });

    await logDashboardAction({
      action: 'REMINDER_CANCEL',
      executorId: currentUserId,
      targetId: reminderId,
      targetType: 'REMINDER',
      details: { title: reminder.title },
    });

    return NextResponse.json({ success: true, message: 'Reminder cancelled.' });
  } catch (error: any) {
    console.error('Failed to cancel reminder:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel reminder' }, { status: 500 });
  }
}
