import { withMutation } from '@/lib/mutation';
// KRAXX Operations Platform — Guild Modules API
// Get active modules and toggle individual modules for a specific guild tenant

import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { assertModuleKey, getModuleState } from '@/lib/module-catalog';
import { NextRequest,NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const modules = await prisma.guildModule.findMany({
      where: { guildId },
      orderBy: { module: 'asc' },
    });

    return NextResponse.json({ modules: modules.map((module) => ({ ...module, state: getModuleState(module.module, module.enabled) })) });
  } catch {
    return NextResponse.json({ error: 'Failed to read guild modules.' }, { status: 500 });
  }
}

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { module: moduleName, enabled } = body;

    if (!moduleName || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing module name or enabled boolean state' },
        { status: 400 }
      );
    }
    if (typeof moduleName !== 'string') return NextResponse.json({ error: 'Invalid module key.' }, { status: 400 });
    try { assertModuleKey(moduleName); } catch { return NextResponse.json({ error: 'Unknown module key.' }, { status: 400 }); }

    const updated = await prisma.guildModule.upsert({
      where: {
        guildId_module: {
          guildId,
          module: String(moduleName),
        },
      },
      update: { enabled },
      create: {
        guildId,
        module: String(moduleName),
        enabled,
      },
    });

    return NextResponse.json({ success: true, module: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update guild module.' }, { status: 500 });
  }
}

export const PATCH = withMutation('MANAGE_SETTINGS', handlePATCH);
