// KRAXX Operations Platform — Manageable Guilds API
// Lists all Discord servers where the logged-in user has admin/manage permissions,
// cross-referenced against the database to determine if KRAXXBot is installed.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchUserGuilds, ManagedGuild } from '@/lib/discord';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.accessToken) {
    return NextResponse.json(
      { error: 'Unauthorized: Session missing access token' },
      { status: 401 }
    );
  }

  try {
    // 1. Fetch guilds where user has MANAGE_GUILD or ADMINISTRATOR
    const userGuilds = await fetchUserGuilds(session.user.accessToken as string);

    if (userGuilds.length === 0) {
      return NextResponse.json({ guilds: [] });
    }

    const guildIds = userGuilds.map((g) => g.id);

    // 2. Query DB to see which of these guilds have KRAXXBot installed
    const installedGuilds = await prisma.guild.findMany({
      where: {
        id: { in: guildIds },
        botInstalled: true,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        botInstalled: true,
      },
    });

    const installedSet = new Set(installedGuilds.map((g) => g.id));
    const clientId = process.env.DISCORD_CLIENT_ID || '';

    // 3. Build response with botInstalled flag and custom invite link
    const managedGuilds: ManagedGuild[] = userGuilds.map((guild) => {
      const isInstalled = installedSet.has(guild.id);
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}&disable_guild_select=true`;

      return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
        botInstalled: isInstalled,
        inviteUrl,
      };
    });

    // Sort: installed servers first, then alphabetically
    managedGuilds.sort((a, b) => {
      if (a.botInstalled && !b.botInstalled) return -1;
      if (!a.botInstalled && b.botInstalled) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ guilds: managedGuilds });
  } catch (error: any) {
    console.error('Failed to fetch user guilds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Discord servers: ' + (error?.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
