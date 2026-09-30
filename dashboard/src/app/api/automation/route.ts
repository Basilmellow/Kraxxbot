import { logDashboardAction } from '@/lib/audit';
import { authOptions } from '@/lib/auth';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';
import { validateAutomationConfig } from '../../../../../src/services/automation-contract';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const access = await requireGuildAccess(guildId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const rules = await prisma.automationRule.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rules, total: rules.length });
  } catch {
    console.error('Failed to fetch automation rules.');
    return NextResponse.json({ error: 'Failed to fetch automation rules' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, trigger, action, config, enabled = true, guildId: bodyGuildId } = body;
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const access = await requireGuildAccess(guildId);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || !trigger || !action) {
      return NextResponse.json({ error: 'Name, trigger, and action are required.' }, { status: 400 });
    }

    let normalizedConfig;
    try {
      normalizedConfig = validateAutomationConfig(trigger, action, config ?? {});
    } catch {
      return NextResponse.json({ error: 'Choose a supported member event and a valid message action configuration.' }, { status: 400 });
    }

    const currentUserId = session!.user.discordId;

    const rule = await prisma.automationRule.create({
      data: {
        guildId,
        name: name.trim(),
        trigger,
        action,
        config: JSON.stringify(normalizedConfig),
        enabled: Boolean(enabled),
        createdBy: currentUserId,
      },
    });

    await logDashboardAction({
      guildId,
      action: 'AUTOMATION_CREATE',
      executorId: currentUserId,
      targetId: rule.id,
      targetType: 'AUTOMATION',
      details: { name: rule.name, trigger: rule.trigger, action: rule.action },
    });

    return NextResponse.json({ success: true, rule });
  } catch {
    console.error('Failed to create automation rule.');
    return NextResponse.json({ error: 'Failed to create automation rule' }, { status: 500 });
  }
}

export const POST = withMutation('MANAGE_AUTOMATIONS', handlePOST);
