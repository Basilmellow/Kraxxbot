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

  try {
    const guildId = request.nextUrl.searchParams.get('guildId') || process.env.GUILD_ID || '';
    const rules = await prisma.automationRule.findMany({
      where: guildId ? { guildId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rules, total: rules.length });
  } catch (error: any) {
    console.error('Failed to fetch automation rules:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch automation rules' }, { status: 500 });
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
    const { name, trigger, action, config, enabled = true, guildId: bodyGuildId } = body;
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId') || process.env.GUILD_ID || '';

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    if (!name || !trigger || !action) {
      return NextResponse.json({ error: 'Name, trigger, and action are required.' }, { status: 400 });
    }

    const currentUserId = session!.user.discordId;

    const rule = await prisma.automationRule.create({
      data: {
        guildId,
        name: name.trim(),
        trigger,
        action,
        config: typeof config === 'string' ? config : JSON.stringify(config || {}),
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
  } catch (error: any) {
    console.error('Failed to create automation rule:', error);
    return NextResponse.json({ error: error.message || 'Failed to create automation rule' }, { status: 500 });
  }
}
