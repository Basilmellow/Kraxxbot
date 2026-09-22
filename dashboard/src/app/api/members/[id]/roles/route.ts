import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addMemberRole, removeMemberRole } from '@/lib/discord';
import { requireTier, RoleTier, requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: userId } = await params;

  try {
    const body = await request.json();
    const { roleId, action, guildId: bodyGuildId } = body; // action: 'ADD' | 'REMOVE'
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const access = await requireGuildAccess(guildId);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!roleId || (action !== 'ADD' && action !== 'REMOVE')) {
      return NextResponse.json({ error: 'Invalid payload. "roleId" and action ("ADD"|"REMOVE") are required.' }, { status: 400 });
    }

    const executorId = session!.user.discordId;

    if (action === 'ADD') {
      await addMemberRole(guildId, userId, roleId, `Role added via KRAXX Operations Dashboard by ${session!.user.name}`);
      await logDashboardAction({
        guildId,
        action: 'MEMBER_ROLE_ADD',
        executorId,
        targetId: userId,
        targetType: 'USER',
        details: { roleId, targetUserId: userId },
      });
    } else {
      await removeMemberRole(guildId, userId, roleId, `Role removed via KRAXX Operations Dashboard by ${session!.user.name}`);
      await logDashboardAction({
        guildId,
        action: 'MEMBER_ROLE_REMOVE',
        executorId,
        targetId: userId,
        targetType: 'USER',
        details: { roleId, targetUserId: userId },
      });
    }

    return NextResponse.json({ success: true, action, roleId, userId });
  } catch (error: any) {
    console.error('Failed to mutate member role:', error);
    return NextResponse.json({ error: error.message || 'Failed to update member role' }, { status: 500 });
  }
}
