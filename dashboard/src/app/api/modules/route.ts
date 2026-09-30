import { logDashboardAction } from '@/lib/audit';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { assertModuleKey, getModuleState, MODULE_CATALOG } from '@/lib/module-catalog';
import { NextRequest,NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  }

  try {
    const existingConfigs = await prisma.guildModule.findMany({
      where: { guildId },
    });
    const configMap = new Map(existingConfigs.map((c) => [c.module, c]));

    const merged = MODULE_CATALOG.map((definition) => {
      const saved = configMap.get(definition.key);
      return {
        ...definition,
        module: definition.key,
        enabled: saved?.enabled ?? false,
        state: getModuleState(definition.key, saved?.enabled),
        updatedAt: saved?.updatedAt || null,
        updatedBy: saved?.updatedBy || null,
      };
    });

    return NextResponse.json({ modules: merged, total: merged.length });
  } catch (error: unknown) {
    console.error('Failed to fetch modules:', error);
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { module: moduleKey, enabled, guildId: bodyGuildId } = body;
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const auth = await requireGuildAccess(guildId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
    }

    if (!moduleKey || enabled === undefined) {
      return NextResponse.json({ error: 'Module key and enabled boolean are required.' }, { status: 400 });
    }
    if (typeof moduleKey !== 'string' || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid module state.' }, { status: 400 });
    }
    try { assertModuleKey(moduleKey); } catch { return NextResponse.json({ error: 'Unknown module key.' }, { status: 400 }); }

    const currentUserId = auth.session!.user.discordId;

    const updated = await prisma.guildModule.upsert({
      where: {
        guildId_module: {
          guildId,
          module: moduleKey,
        },
      },
      update: {
        enabled,
        updatedBy: currentUserId,
      },
      create: {
        guildId,
        module: moduleKey,
        enabled,
        updatedBy: currentUserId,
      },
    });

    await logDashboardAction({
      guildId,
      action: enabled ? 'MODULE_ENABLE' : 'MODULE_DISABLE',
      executorId: currentUserId,
      targetId: moduleKey,
      targetType: 'MODULE',
      details: { module: moduleKey, enabled },
    });

    return NextResponse.json({ success: true, module: updated });
  } catch (error: unknown) {
    console.error('Failed to update module state:', error);
    return NextResponse.json({ error: 'Failed to update module state' }, { status: 500 });
  }
}

export const POST = withMutation('MANAGE_SETTINGS', handlePOST);
