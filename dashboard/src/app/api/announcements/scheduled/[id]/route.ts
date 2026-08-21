// KRAXX Operations Platform — Single Scheduled Announcement API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canScheduleAnnouncements } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const item = await prisma.scheduledAnnouncement.findUnique({
      where: { id },
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scheduled announcement' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canScheduleAnnouncements(session.user.roleTier)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.scheduledAnnouncement.findUnique({
      where: { id },
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
    const { title, content, channelId, department, mentionType, mentionRoleId, embeds, scheduledFor } = body;

    let scheduledDate: Date | undefined = undefined;
    if (scheduledFor) {
      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return NextResponse.json({ error: 'Scheduled date must be in the future.' }, { status: 400 });
      }
    }

    const updated = await prisma.scheduledAnnouncement.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title?.trim() || null } : {}),
        ...(content !== undefined ? { content: content?.trim() || null } : {}),
        ...(channelId ? { channelId } : {}),
        ...(department ? { department: department.toUpperCase() } : {}),
        ...(mentionType ? { mentionType } : {}),
        ...(mentionRoleId !== undefined ? { mentionRoleId: mentionRoleId || null } : {}),
        ...(embeds !== undefined ? { embedPayload: embeds ? JSON.stringify(embeds) : null } : {}),
        ...(scheduledDate ? { scheduledFor: scheduledDate } : {}),
      },
    });

    await logDashboardAction({
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
  } catch (error: any) {
    console.error('[API] Edit scheduled error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update scheduled announcement' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canScheduleAnnouncements(session.user.roleTier)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.scheduledAnnouncement.findUnique({
      where: { id },
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
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await logDashboardAction({
      action: 'ANNOUNCEMENT_CANCEL',
      executorId: session.user.discordId,
      targetId: id,
      targetType: 'SCHEDULED_ANNOUNCEMENT',
      details: { title: cancelled.title, channelId: cancelled.channelId },
    });

    return NextResponse.json({ success: true, id, status: 'CANCELLED' });
  } catch (error: any) {
    console.error('[API] Cancel scheduled error:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel scheduled announcement' }, { status: 500 });
  }
}
