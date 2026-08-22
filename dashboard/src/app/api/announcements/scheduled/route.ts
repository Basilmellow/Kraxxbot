// KRAXX Operations Platform — Scheduled Announcements List API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permCheck = requireTier(session.user.roleTier, RoleTier.MANAGEMENT_HEAD);
  if (!permCheck.authorized) {
    return NextResponse.json({ error: permCheck.reason }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get('status');

  try {
    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    const scheduled = await prisma.scheduledAnnouncement.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
    });

    return NextResponse.json({
      scheduled: scheduled.map((s) => ({
        ...s,
        scheduledFor: s.scheduledFor.toISOString(),
        sentAt: s.sentAt ? s.sentAt.toISOString() : null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        embedPayload: s.embedPayload ? JSON.parse(s.embedPayload) : null,
      })),
    });
  } catch (error) {
    console.error('[API] Scheduled list error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve scheduled announcements' },
      { status: 500 }
    );
  }
}
