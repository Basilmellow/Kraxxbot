import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier, requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: meetingId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { status, agenda, startTime, locationChannelId } = body;

    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (agenda !== undefined) dataToUpdate.agenda = agenda.trim();
    if (startTime !== undefined) dataToUpdate.startTime = new Date(startTime);
    if (locationChannelId !== undefined) dataToUpdate.locationChannelId = locationChannelId || null;

    const updated = await prisma.meeting.update({
      where: { id: meetingId, guildId },
      data: dataToUpdate,
    });

    await logDashboardAction({
      guildId,
      action: 'MEETING_UPDATE',
      executorId: currentUserId,
      targetId: meetingId,
      targetType: 'MEETING',
      details: { title: updated.title, changes: dataToUpdate },
    });

    return NextResponse.json({ success: true, meeting: updated });
  } catch (error: any) {
    console.error('Failed to update meeting:', error);
    return NextResponse.json({ error: error.message || 'Failed to update meeting' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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
  } catch (error: any) {
    console.error('Failed to delete meeting:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete meeting' }, { status: 500 });
  }
}
