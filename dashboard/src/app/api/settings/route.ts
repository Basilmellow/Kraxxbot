import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier, requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

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
  } catch (error: any) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const updated = await prisma.guildSettings.upsert({
      where: { guildId },
      update: settings,
      create: {
        guildId,
        ...settings,
      },
    });

    await logDashboardAction({
      guildId,
      action: 'CONFIG_CHANGED',
      executorId: currentUserId,
      targetType: 'SYSTEM',
      details: { changedKeys: Object.keys(settings) },
    });

    return NextResponse.json({ success: true, settings: updated, message: 'Settings saved successfully.' });
  } catch (error: any) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
