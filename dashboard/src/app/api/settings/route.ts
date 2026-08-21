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
    const configs = await prisma.botConfig.findMany();
    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    return NextResponse.json({ configs: configMap });
  } catch (error: any) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.FOUNDER);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { settings = {} } = body;

    const currentUserId = session!.user.discordId;

    for (const [key, val] of Object.entries(settings)) {
      if (typeof val === 'string') {
        await prisma.botConfig.upsert({
          where: { key },
          update: { value: val },
          create: { key, value: val },
        });
      }
    }

    await logDashboardAction({
      action: 'CONFIG_CHANGED',
      executorId: currentUserId,
      targetType: 'SYSTEM',
      details: { changedKeys: Object.keys(settings) },
    });

    return NextResponse.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
