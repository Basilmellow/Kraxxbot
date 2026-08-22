import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || '';
  const departmentFilter = searchParams.get('department') || '';

  try {
    const whereClause: any = {};
    if (statusFilter && statusFilter !== 'ALL') whereClause.status = statusFilter;
    if (departmentFilter && departmentFilter !== 'ALL') whereClause.department = departmentFilter;

    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      orderBy: { startTime: 'asc' },
      take: 100,
    });

    return NextResponse.json({ meetings, total: meetings.length });
  } catch (error: any) {
    console.error('Failed to fetch meetings:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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
    } = body;

    if (!title || !agenda || !startTime) {
      return NextResponse.json({ error: 'Title, agenda, and start time are required.' }, { status: 400 });
    }

    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start time.' }, { status: 400 });
    }

    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const currentUserId = session!.user.discordId;

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        agenda: agenda.trim(),
        department,
        startTime: startDate,
        endTime: endDate,
        locationChannelId: locationChannelId || null,
        organizerId: currentUserId,
        attendees: JSON.stringify(attendees),
        status: 'SCHEDULED',
      },
    });

    await logDashboardAction({
      action: 'MEETING_CREATE',
      executorId: currentUserId,
      targetId: meeting.id,
      targetType: 'MEETING',
      details: { title: meeting.title, startTime: startDate.toISOString(), department },
    });

    return NextResponse.json({ success: true, meeting });
  } catch (error: any) {
    console.error('Failed to create meeting:', error);
    return NextResponse.json({ error: error.message || 'Failed to create meeting' }, { status: 500 });
  }
}
