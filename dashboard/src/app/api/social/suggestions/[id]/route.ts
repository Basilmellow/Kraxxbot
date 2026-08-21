import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.TEAM_LEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: suggestionId } = await params;
  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { status, reviewerNotes } = body;

    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (reviewerNotes !== undefined) dataToUpdate.reviewerNotes = reviewerNotes.trim();

    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: dataToUpdate,
    });

    await logDashboardAction({
      action: 'SUGGESTION_REVIEW',
      executorId: currentUserId,
      targetId: suggestionId,
      targetType: 'SUGGESTION',
      details: { status: updated.status, reviewerNotes },
    });

    return NextResponse.json({ success: true, suggestion: updated });
  } catch (error: any) {
    console.error('Failed to update suggestion:', error);
    return NextResponse.json({ error: error.message || 'Failed to update suggestion' }, { status: 500 });
  }
}
