// KRAXX Operations Platform — Guild Settings API
// Configure server-specific prefix, channels, and role bindings

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
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    return NextResponse.json({ settings });
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

    const allowedFields = [
      'prefix',
      'welcomeChannelId',
      'announcementChannelId',
      'modLogChannelId',
      'auditLogChannelId',
      'ticketCategoryId',
      'ticketTranscriptsChannelId',
      'adminRoleId',
      'modRoleId',
      'ticketSupportRoleId',
      'verifiedRoleId',
    ];

    const dataToUpdate: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        dataToUpdate[field] = body[field];
      }
    }

    const updated = await prisma.guildSettings.upsert({
      where: { guildId },
      update: dataToUpdate,
      create: {
        guildId,
        ...dataToUpdate,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
