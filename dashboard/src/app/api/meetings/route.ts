import { logDashboardAction } from '@/lib/audit';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { validateChannel } from '@/lib/destinations';
import { meetingCreateIdempotencyKey, queueMeetingAnnouncement } from '@/lib/meeting-announcements';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || '';
  const departmentFilter = searchParams.get('department') || '';
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const access = await requireGuildAccess(guildId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const whereClause: Prisma.MeetingWhereInput = { guildId };
    if (statusFilter && statusFilter !== 'ALL') whereClause.status = statusFilter;
    if (departmentFilter && departmentFilter !== 'ALL') whereClause.department = departmentFilter;

    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      orderBy: { startTime: 'asc' },
      take: 100,
    });

    return NextResponse.json({ meetings, total: meetings.length });
  } catch {
    console.error('Failed to fetch meetings.');
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  try {
    const body = await request.json();
    const {
      title,
      agenda,
      department = 'GENERAL',
      startTime,
      durationMinutes = 60,
      locationChannelId,
      attendees = [],
      guildId: bodyGuildId,
      requestId,
    } = body;
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const access = await requireGuildAccess(guildId);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!title || !agenda || !startTime) {
      return NextResponse.json({ error: 'Title, agenda, and start time are required.' }, { status: 400 });
    }
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return NextResponse.json({ error: 'A valid meeting request ID is required.' }, { status: 400 });
    }

    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start time.' }, { status: 400 });
    }

    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const currentUserId = session!.user.discordId;

    if (!locationChannelId) {
      return NextResponse.json({ error: 'Choose a Discord channel for meeting announcements.' }, { status: 400 });
    }
    await validateChannel(guildId, locationChannelId, true, false);
    const createKey = meetingCreateIdempotencyKey(requestId, guildId, currentUserId);
    let meeting: Awaited<ReturnType<typeof prisma.meeting.create>>;
    let announcementState = 'QUEUED';
    try {
      meeting = await prisma.$transaction(async tx => {
        const created = await tx.meeting.create({
          data: {
            guildId,
            title: title.trim(),
            agenda: agenda.trim(),
            department,
            startTime: startDate,
            endTime: endDate,
            locationChannelId,
            organizerId: currentUserId,
            attendees: JSON.stringify(attendees),
            status: 'SCHEDULED',
          },
        });
        await queueMeetingAnnouncement(tx, created, 'SCHEDULED', currentUserId, new Date(), {
          key: createKey,
          announcementId: created.id,
        });
        return created;
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const receipt = await prisma.scheduledAnnouncement.findUnique({ where: { idempotencyKey: createKey } });
      const existing = receipt && await prisma.meeting.findFirst({ where: { id: receipt.id, guildId, organizerId: currentUserId } });
      if (!receipt || !existing) throw error;
      const sameRequest = existing.title === title.trim()
        && existing.agenda === agenda.trim()
        && existing.department === department
        && existing.startTime.getTime() === startDate.getTime()
        && existing.endTime?.getTime() === endDate.getTime()
        && existing.locationChannelId === locationChannelId;
      if (!sameRequest) return NextResponse.json({ error: 'This meeting request ID was already used for different details.' }, { status: 409 });
      meeting = existing;
      announcementState = receipt.status === 'SENT' ? 'SENT'
        : ['PENDING', 'PROCESSING'].includes(receipt.status) ? 'QUEUED' : receipt.status;
    }

    await logDashboardAction({
      guildId,
      action: 'MEETING_CREATE',
      executorId: currentUserId,
      targetId: meeting.id,
      targetType: 'MEETING',
      details: { title: meeting.title, startTime: startDate.toISOString(), department },
    });

    return NextResponse.json({ success: true, announcementQueued: announcementState === 'QUEUED', announcementState, meeting });
  } catch {
    console.error('Failed to create meeting.');
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}

export const POST = withMutation('MANAGE_SETTINGS', handlePOST);
