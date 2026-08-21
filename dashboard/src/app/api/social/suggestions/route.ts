import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.TEAM_LEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || '';

  try {
    const whereClause: any = {};
    if (statusFilter && statusFilter !== 'ALL') whereClause.status = statusFilter;

    const suggestions = await prisma.suggestion.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ suggestions, total: suggestions.length });
  } catch (error: any) {
    console.error('Failed to fetch suggestions:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch suggestions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.USER);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    const currentUserId = session!.user.discordId;

    const suggestion = await prisma.suggestion.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        authorId: currentUserId,
        status: 'SUBMITTED',
      },
    });

    await logDashboardAction({
      action: 'SUGGESTION_CREATE',
      executorId: currentUserId,
      targetId: suggestion.id,
      targetType: 'SUGGESTION',
      details: { title: suggestion.title },
    });

    return NextResponse.json({ success: true, suggestion });
  } catch (error: any) {
    console.error('Failed to create suggestion:', error);
    return NextResponse.json({ error: error.message || 'Failed to create suggestion' }, { status: 500 });
  }
}
