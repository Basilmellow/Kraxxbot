import { logDashboardAction } from '@/lib/audit';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { saveSettings } from '@/lib/settings-service';
import { NextRequest,NextResponse } from 'next/server';
import { ZodError } from 'zod';

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
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    return NextResponse.json({ settings: settings || {} });
  } catch (error: unknown) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid settings fields." }, { status: 400 });
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings = {}, guildId: bodyGuildId } = body;
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const auth = await requireGuildAccess(guildId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
    }

    const currentUserId = auth.session!.user.discordId;

    const updated = await saveSettings(guildId, settings);

    await logDashboardAction({
      guildId,
      action: 'CONFIG_CHANGED',
      executorId: currentUserId,
      targetType: 'SYSTEM',
      details: { changedKeys: Object.keys(settings) },
    });

    return NextResponse.json({ success: true, settings: updated, message: 'Settings saved successfully.' });
  } catch (error: unknown) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid settings fields." }, { status: 400 });
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

export const POST = withMutation('MANAGE_SETTINGS', handlePOST);
