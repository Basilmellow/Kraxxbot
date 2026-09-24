import { NextRequest, NextResponse } from 'next/server';
import { addMemberRole, fetchBotRoleContext, getRoleManageability, removeMemberRole } from '@/lib/discord';
import { requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const session = access.session;
    const context = await fetchBotRoleContext(guildId);
    const targetRole = context.roles.find((role) => role.id === roleId);
    if (!targetRole) {
      return NextResponse.json({ error: 'That role does not belong to this server.' }, { status: 404 });
    }

    const capability = getRoleManageability(targetRole, context);
    if (!capability.manageable) {
      const reason = capability.manageabilityReason === 'EVERYONE'
        ? 'The @everyone role cannot be assigned or removed.'
        : capability.manageabilityReason === 'MANAGED'
          ? 'Discord integration roles cannot be managed here.'
          : capability.manageabilityReason === 'MISSING_MANAGE_ROLES'
            ? 'KRAXXBot does not have permission to manage roles in this server.'
            : 'This role is at or above KRAXXBot’s highest role.';
      return NextResponse.json({ error: reason, code: 'ROLE_NOT_MANAGEABLE' }, { status: 403 });
    }

    const executorId = session?.user?.discordId || 'UNKNOWN';

    if (action === 'ADD') {
      await addMemberRole(guildId, userId, roleId, `Role added via KRAXX Operations Dashboard by ${session?.user?.name || 'dashboard user'}`);
      await logDashboardAction({
        guildId,
        action: 'MEMBER_ROLE_ADD',
        executorId,
        targetId: userId,
        targetType: 'USER',
        details: { roleId, targetUserId: userId },
      });
    } else {
      await removeMemberRole(guildId, userId, roleId, `Role removed via KRAXX Operations Dashboard by ${session?.user?.name || 'dashboard user'}`);
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
  } catch (error: unknown) {
    console.error('Failed to mutate member role:', error);
    return NextResponse.json({ error: 'Unable to update this member role. Verify bot permissions and retry.' }, { status: 502 });
  }
}
