// KRAXX Operations Platform — Manageable Guilds API
// Lists all Discord servers where the logged-in user has admin/manage permissions,
// cross-referenced against the database to determine if KRAXXBot is installed.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchGuildById, fetchUserGuilds, isBotInstalledInGuild, ManagedGuild } from '@/lib/discord';
import { reconcileInstalledGuild } from '@/lib/guild-registry';
import { prisma } from '@/lib/prisma';

const INSTALLATION_CHECK_CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(
  values: T[],
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(INSTALLATION_CHECK_CONCURRENCY, values.length) }, worker)
  );

  return results;
}

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

    const guildIds = userGuilds.map((guild) => guild.id);

    // The durable registry is configuration storage, not installation proof.
    // Discord's bot-token REST API remains available when the Gateway worker is offline.
    const existingGuilds = await prisma.guild.findMany({
      where: {
        id: { in: guildIds },
      },
      select: {
        id: true,
      },
    });
    const existingGuildIds = new Set(existingGuilds.map((guild) => guild.id));

    // Discord has no bulk "bot is in these guilds" endpoint. Bound concurrency
    // avoids an uncontrolled request burst while allowing independent results.
    const installationChecks = await mapWithConcurrency(userGuilds, async (guild) => {
      try {
        return { guild, installed: await isBotInstalledInGuild(guild.id), verificationFailed: false };
      } catch (error) {
        // Keep results for other guilds; never grant access when a verification
        // request fails due to a transient Discord or credential error.
        console.warn(`Unable to verify bot installation for guild ${guild.id}`, error);
        return { guild, installed: false, verificationFailed: true };
      }
    });

    if (installationChecks.every((check) => check.verificationFailed)) {
      return NextResponse.json(
        { error: 'Unable to verify KRAXXBot installation. Please try again.' },
        { status: 503 }
      );
    }

    const verifiedInstalledIds = new Set(
      installationChecks
        .filter((check) => check.installed && existingGuildIds.has(check.guild.id))
        .map((check) => check.guild.id)
    );

    // A positive REST check repairs a stale removal flag without relying on a
    // Gateway reconnect. This is safe because the guild id came from OAuth.
    if (verifiedInstalledIds.size > 0) {
      await prisma.guild.updateMany({
        where: { id: { in: [...verifiedInstalledIds] } },
        data: { botInstalled: true },
      });
    }

    // Initialize any verified installation not yet registered by the worker.
    const missingInstalledGuilds = installationChecks.filter(
      (check) => check.installed && !existingGuildIds.has(check.guild.id)
    );
    const reconciled = await mapWithConcurrency(missingInstalledGuilds, async (check) => {
      try {
        const discordGuild = await fetchGuildById(check.guild.id);
        await reconcileInstalledGuild(discordGuild);
        return check.guild.id;
      } catch (error) {
        // Fail closed for this guild; other independently verified guilds remain usable.
        console.warn(`Unable to reconcile verified guild ${check.guild.id}`, error);
        return null;
      }
    });
    for (const guildId of reconciled) {
      if (guildId) verifiedInstalledIds.add(guildId);
    }

    const clientId = process.env.DISCORD_CLIENT_ID || '';

    // Return all manageable guilds for the invitation UI, but only a successful
    // bot-token verification grants the installed/dashboard-capable state.
    const managedGuilds: ManagedGuild[] = userGuilds.map((guild) => {
      const isInstalled = verifiedInstalledIds.has(guild.id);
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
