import { withMutation } from '@/lib/mutation';
import { saveSettings } from '@/lib/settings-service';
import { ZodError } from 'zod';
// KRAXX Operations Platform — Guild Settings API
// Configure server-specific prefix, channels, and role bindings

import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
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
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid settings fields." }, { status: 400 });
    return NextResponse.json({ error: 'Failed to read guild settings.' }, { status: 500 });
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

    const updated = await saveSettings(guildId, body);

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: unknown) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid settings fields." }, { status: 400 });
    return NextResponse.json({ error: 'Failed to update guild settings.' }, { status: 500 });
  }
}

export const PATCH = withMutation('MANAGE_SETTINGS', handlePATCH);
