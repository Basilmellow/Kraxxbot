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

  const currentUserId = session!.user.discordId;

  try {
    const notifications = await prisma.dashboardNotification.findMany({
      where: {
        OR: [
          { userId: currentUserId },
          { userId: 'GLOBAL' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { action, id } = body; // action: 'MARK_READ' | 'MARK_ALL_READ'

    if (action === 'MARK_READ' && id) {
      await prisma.dashboardNotification.update({
        where: { id },
        data: { read: true },
      });
    } else if (action === 'MARK_ALL_READ') {
      await prisma.dashboardNotification.updateMany({
        where: {
          OR: [
            { userId: currentUserId },
            { userId: 'GLOBAL' },
          ],
        },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: error.message || 'Failed to update notifications' }, { status: 500 });
  }
}
