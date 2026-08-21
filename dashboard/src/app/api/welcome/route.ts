import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

const DEFAULT_GUILD_ID = process.env.DISCORD_GUILD_ID || 'default';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    let config = await prisma.welcomeConfig.findUnique({
      where: { guildId: DEFAULT_GUILD_ID },
    });

    if (!config) {
      config = await prisma.welcomeConfig.create({
        data: {
          guildId: DEFAULT_GUILD_ID,
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
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
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

    const currentUserId = session!.user.discordId;

    const config = await prisma.welcomeConfig.upsert({
      where: { guildId: DEFAULT_GUILD_ID },
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
        guildId: DEFAULT_GUILD_ID,
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
      action: 'WELCOME_UPDATE',
      executorId: currentUserId,
      targetId: DEFAULT_GUILD_ID,
      targetType: 'GUILD',
      details: { enabled: config.enabled, channelId: config.channelId },
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Failed to update welcome config:', error);
    return NextResponse.json({ error: error.message || 'Failed to update welcome config' }, { status: 500 });
  }
}
