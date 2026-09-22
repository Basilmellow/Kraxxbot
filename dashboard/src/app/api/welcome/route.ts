import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireGuildAccess } from '@/lib/permissions';
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
    let config = await prisma.welcomeConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await prisma.welcomeConfig.create({
        data: {
          guildId,
          enabled: false,
          message: 'Welcome {user} to **{server}**! We are now {memberCount} operators strong.',
          dmEnabled: false,
          dmMessage: 'Welcome to {server}! Check out {rules} to get started.',
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Failed to fetch welcome config:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch welcome configuration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const guildId = body.guildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const auth = await requireGuildAccess(guildId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
    }

    const {
      enabled,
      channelId,
      message,
      embedJson,
      imageUrl,
      roleId,
      dmEnabled,
      dmMessage,
      leaveChannelId,
      leaveMessage,
    } = body;

    const currentUserId = auth.session?.user?.discordId || 'UNKNOWN';

    const config = await prisma.welcomeConfig.upsert({
      where: { guildId },
      update: {
        enabled: Boolean(enabled),
        channelId: channelId || null,
        message: message || null,
        embedJson: embedJson ? (typeof embedJson === 'string' ? embedJson : JSON.stringify(embedJson)) : null,
        imageUrl: imageUrl || null,
        roleId: roleId || null,
        dmEnabled: Boolean(dmEnabled),
        dmMessage: dmMessage || null,
        leaveChannelId: leaveChannelId || null,
        leaveMessage: leaveMessage || null,
      },
      create: {
        guildId,
        enabled: Boolean(enabled),
        channelId: channelId || null,
        message: message || null,
        embedJson: embedJson ? (typeof embedJson === 'string' ? embedJson : JSON.stringify(embedJson)) : null,
        imageUrl: imageUrl || null,
        roleId: roleId || null,
        dmEnabled: Boolean(dmEnabled),
        dmMessage: dmMessage || null,
        leaveChannelId: leaveChannelId || null,
        leaveMessage: leaveMessage || null,
      },
    });

    await logDashboardAction({
      guildId,
      action: 'WELCOME_UPDATE',
      executorId: currentUserId,
      targetId: guildId,
      targetType: 'GUILD',
      details: { enabled: config.enabled, channelId: config.channelId },
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Failed to update welcome config:', error);
    return NextResponse.json({ error: error.message || 'Failed to update welcome config' }, { status: 500 });
  }
}
