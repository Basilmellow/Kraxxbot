import { logDashboardAction } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { withMutation } from '@/lib/mutation';
import { validateChannel } from '@/lib/destinations';
import { queueMeetingAnnouncement } from '@/lib/meeting-announcements';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const { id: meetingId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { status, agenda, startTime, locationChannelId } = body;

    const current = await prisma.meeting.findFirst({ where: { id: meetingId, guildId } });
    if (!current) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });

    let announcementStage: 'STARTED' | 'CONCLUDED' | null = null;
    if (status !== undefined && status !== current.status) {
      if (status === 'IN_PROGRESS' && current.status === 'SCHEDULED') announcementStage = 'STARTED';
      else if (status === 'COMPLETED' && current.status === 'IN_PROGRESS') announcementStage = 'CONCLUDED';
      else if (!(status === 'CANCELLED' && current.status === 'SCHEDULED')) {
        return NextResponse.json({ error: `Cannot change meeting from ${current.status} to ${String(status)}.` }, { status: 409 });
      }
    }

    if (announcementStage) {
      if (!current.locationChannelId) return NextResponse.json({ error: 'Choose a Discord channel before starting or concluding this meeting.' }, { status: 400 });
      await validateChannel(guildId, current.locationChannelId, true, false);
    }
    if (locationChannelId) await validateChannel(guildId, locationChannelId, true, false);

    const dataToUpdate: Prisma.MeetingUpdateInput = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (agenda !== undefined) dataToUpdate.agenda = agenda.trim();
    if (startTime !== undefined) dataToUpdate.startTime = new Date(startTime);
    if (locationChannelId !== undefined) dataToUpdate.locationChannelId = locationChannelId || null;

    const result = await prisma.$transaction(async tx => {
      const latest = await tx.meeting.findFirst({ where: { id: meetingId, guildId } });
      if (!latest) throw new Error('MEETING_NOT_FOUND');
      if (status !== undefined && latest.status !== current.status) throw new Error('MEETING_STATUS_CHANGED');

      const updated = await tx.meeting.update({ where: { id: meetingId }, data: dataToUpdate });
      if (announcementStage) await queueMeetingAnnouncement(tx, updated, announcementStage, currentUserId);
      if (status === 'CANCELLED' && latest.status === 'SCHEDULED') {
        await tx.scheduledAnnouncement.updateMany({
          where: { idempotencyKey: `meeting:${meetingId}:SCHEDULED`, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      }
      return { updated, announcementQueued: announcementStage !== null };
    });

    await logDashboardAction({
      guildId,
      action: 'MEETING_UPDATE',
      executorId: currentUserId,
      targetId: meetingId,
      targetType: 'MEETING',
      details: { title: result.updated.title, changes: dataToUpdate, announcementQueued: result.announcementQueued },
    });

    return NextResponse.json({ success: true, announcementQueued: result.announcementQueued, meeting: result.updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'MEETING_NOT_FOUND') return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    if (error instanceof Error && error.message === 'MEETING_STATUS_CHANGED') return NextResponse.json({ error: 'Meeting status changed. Refresh before trying again.' }, { status: 409 });
    console.error('Failed to update meeting.');
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const { id: meetingId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const meeting = await prisma.meeting.delete({
      where: { id: meetingId, guildId },
    });

    await logDashboardAction({
      guildId,
      action: 'MEETING_DELETE',
      executorId: currentUserId,
      targetId: meetingId,
      targetType: 'MEETING',
      details: { title: meeting.title },
    });

    return NextResponse.json({ success: true, message: 'Meeting deleted.' });
  } catch {
    console.error('Failed to delete meeting.');
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}

export const PATCH = withMutation('MANAGE_SETTINGS', handlePATCH);
export const DELETE = withMutation('MANAGE_SETTINGS', handleDELETE);
