import { authOptions } from '@/lib/auth';
import { withMutation } from '@/lib/mutation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';


export async function GET() {
  const session = await getServerSession(authOptions);

  const currentUserId = session?.user?.discordId;
  if (!currentUserId) {
    return NextResponse.json({ error: 'Discord user identity is missing from this session.' }, { status: 401 });
  }

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

    const unreadCount = notifications.filter((n) => n.userId !== 'GLOBAL' && !n.read).length;

    return NextResponse.json({
      notifications: notifications.map((notification) =>
        notification.userId === 'GLOBAL' ? { ...notification, read: true } : notification
      ),
      unreadCount,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications.' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  const currentUserId = session?.user?.discordId;
  if (!currentUserId) {
    return NextResponse.json({ error: 'Discord user identity is missing from this session.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, id } = body as { action?: string; id?: string };

    if (action === 'MARK_READ' && id) {
      const update = await prisma.dashboardNotification.updateMany({
        where: {
          id,
          userId: currentUserId,
        },
        data: { read: true },
      });
      if (update.count === 0) {
        return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
      }
    } else if (action === 'MARK_ALL_READ') {
      await prisma.dashboardNotification.updateMany({
        where: {
          userId: currentUserId,
        },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications.' }, { status: 500 });
  }
}

export const POST = withMutation('SESSION', handlePOST);
