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

  const { id: ruleId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { name, trigger, action, config, enabled } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (trigger !== undefined) dataToUpdate.trigger = trigger;
    if (action !== undefined) dataToUpdate.action = action;
    if (config !== undefined) dataToUpdate.config = typeof config === 'string' ? config : JSON.stringify(config);
    if (enabled !== undefined) dataToUpdate.enabled = Boolean(enabled);

    const updated = await prisma.automationRule.update({
      where: { id: ruleId, guildId },
      data: dataToUpdate,
    });

    await logDashboardAction({
      action: 'AUTOMATION_UPDATE',
      guildId,
      executorId: currentUserId,
      targetId: ruleId,
      targetType: 'AUTOMATION',
      details: { name: updated.name, changes: dataToUpdate },
    });

    return NextResponse.json({ success: true, rule: updated });
  } catch (error: any) {
    console.error('Failed to update automation rule:', error);
    return NextResponse.json({ error: error.message || 'Failed to update automation rule' }, { status: 500 });
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

  const { id: ruleId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const rule = await prisma.automationRule.delete({
      where: { id: ruleId, guildId },
    });

    await logDashboardAction({
      action: 'AUTOMATION_DELETE',
      guildId,
      executorId: currentUserId,
      targetId: ruleId,
      targetType: 'AUTOMATION',
      details: { name: rule.name },
    });

    return NextResponse.json({ success: true, message: 'Automation rule deleted.' });
  } catch (error: any) {
    console.error('Failed to delete automation rule:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete automation rule' }, { status: 500 });
  }
}
