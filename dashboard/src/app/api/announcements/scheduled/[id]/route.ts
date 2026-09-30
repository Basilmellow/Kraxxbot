import { validateChannel } from '@/lib/destinations';
import { withMutation } from '@/lib/mutation';
// KRAXX Operations Platform — Single Scheduled Announcement API
import { logDashboardAction } from '@/lib/audit';
import { authOptions } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const item = await prisma.scheduledAnnouncement.findUnique({
      where: { id, guildId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Scheduled announcement not found' }, { status: 404 });
    }

    return NextResponse.json({
      scheduled: {
        ...item,
        scheduledFor: item.scheduledFor.toISOString(),
        embedPayload: item.embedPayload ? JSON.parse(item.embedPayload) : null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch scheduled announcement' }, { status: 500 });
  }
}

async function handlePATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const existing = await prisma.scheduledAnnouncement.findUnique({
      where: { id, guildId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Scheduled announcement not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot edit an announcement with status "${existing.status}". Only PENDING announcements can be modified.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, content, channelId, department, type, mentionType, mentionRoleId, embeds, scheduledFor } = body;

    let scheduledDate: Date | undefined = undefined;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return NextResponse.json({ error: 'Scheduled date must be in the future.' }, { status: 400 });
      }
    }

    await validateChannel(guildId, channelId || existing.channelId);
    const updated = await prisma.scheduledAnnouncement.update({
      where: { id, guildId, status: 'PENDING' },
      data: {
        ...(title !== undefined ? { title: title?.trim() || null } : {}),
        ...(content !== undefined ? { content: content?.trim() || null } : {}),
        ...(channelId ? { channelId } : {}),
        ...(department ? { department: department.toUpperCase() } : {}),
        ...(type ? { announcementType: type.toUpperCase() } : {}),
        ...(mentionType ? { mentionType } : {}),
        ...(mentionRoleId !== undefined ? { mentionRoleId: mentionRoleId || null } : {}),
        ...(embeds !== undefined ? { embedPayload: embeds ? JSON.stringify(embeds) : null } : {}),
        ...(scheduledDate ? { scheduledFor: scheduledDate } : {}),
      },
    });

    await logDashboardAction({
      guildId,
      action: 'ANNOUNCEMENT_EDIT',
      executorId: session.user.discordId,
      targetId: id,
      targetType: 'SCHEDULED_ANNOUNCEMENT',
      details: { title: updated.title, channelId: updated.channelId },
    });

    return NextResponse.json({
      success: true,
      scheduled: {
        ...updated,
        scheduledFor: updated.scheduledFor.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('[API] Edit scheduled error:', error);
    return NextResponse.json({ error: 'Failed to update scheduled announcement' }, { status: 500 });
  }
}

async function handleDELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });

  try {
    const existing = await prisma.scheduledAnnouncement.findUnique({
      where: { id, guildId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Scheduled announcement not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot cancel an announcement with status "${existing.status}".` },
        { status: 400 }
      );
    }

    const cancelled = await prisma.scheduledAnnouncement.update({
      where: { id, guildId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    await logDashboardAction({
      guildId,
      action: 'ANNOUNCEMENT_CANCEL',
      executorId: session.user.discordId,
      targetId: id,
      targetType: 'SCHEDULED_ANNOUNCEMENT',
      details: { title: cancelled.title, channelId: cancelled.channelId },
    });

    return NextResponse.json({ success: true, id, status: 'CANCELLED' });
  } catch (error: unknown) {
    console.error('[API] Cancel scheduled error:', error);
    return NextResponse.json({ error: 'Failed to cancel scheduled announcement' }, { status: 500 });
  }
}

export const PATCH = withMutation('MANAGE_ANNOUNCEMENTS', handlePATCH);
export const DELETE = withMutation('MANAGE_ANNOUNCEMENTS', handleDELETE);
