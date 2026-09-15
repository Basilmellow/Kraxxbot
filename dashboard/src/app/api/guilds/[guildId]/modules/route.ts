// KRAXX Operations Platform — Guild Modules API
// Get active modules and toggle individual modules for a specific guild tenant

import { NextRequest, NextResponse } from 'next/server';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json({ modules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
