import { Prisma } from '@prisma/client';
import { logDashboardAction } from '@/lib/audit';
import { authOptions } from '@/lib/auth';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
import { validateAutomationConfig } from '../../../../../../src/services/automation-contract';

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const { id: ruleId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { name, trigger, action, config, enabled } = body;

    const existing = await prisma.automationRule.findFirst({ where: { id: ruleId, guildId } });
    if (!existing) return NextResponse.json({ error: 'Automation rule not found.' }, { status: 404 });

    const dataToUpdate: Prisma.AutomationRuleUpdateInput = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) return NextResponse.json({ error: 'Name must be between 1 and 80 characters.' }, { status: 400 });
      dataToUpdate.name = name.trim();
    }
    const nextTrigger = trigger ?? existing.trigger;
    const nextAction = action ?? existing.action;
    if (trigger !== undefined || action !== undefined || config !== undefined) {
      try {
        dataToUpdate.config = JSON.stringify(validateAutomationConfig(nextTrigger, nextAction, config ?? existing.config));
      } catch {
        return NextResponse.json({ error: 'Choose a supported member event and a valid message action configuration.' }, { status: 400 });
      }
      if (trigger !== undefined) dataToUpdate.trigger = nextTrigger;
      if (action !== undefined) dataToUpdate.action = nextAction;
    }
    if (enabled !== undefined) dataToUpdate.enabled = Boolean(enabled);

    const updated = await prisma.automationRule.update({
      where: { id: ruleId, guildId },
      data: dataToUpdate,
    });

    await logDashboardAction({
      guildId,
      action: 'AUTOMATION_UPDATE',
      executorId: currentUserId,
      targetId: ruleId,
      targetType: 'AUTOMATION',
      details: { name: updated.name, changes: dataToUpdate },
    });

    return NextResponse.json({ success: true, rule: updated });
  } catch {
    console.error('Failed to update automation rule.');
    return NextResponse.json({ error: 'Failed to update automation rule' }, { status: 500 });
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

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
      guildId,
      action: 'AUTOMATION_DELETE',
      executorId: currentUserId,
      targetId: ruleId,
      targetType: 'AUTOMATION',
      details: { name: rule.name },
    });

    return NextResponse.json({ success: true, message: 'Automation rule deleted.' });
  } catch {
    console.error('Failed to delete automation rule.');
    return NextResponse.json({ error: 'Failed to delete automation rule' }, { status: 500 });
  }
}

export const PATCH = withMutation('MANAGE_AUTOMATIONS', handlePATCH);
export const DELETE = withMutation('MANAGE_AUTOMATIONS', handleDELETE);
