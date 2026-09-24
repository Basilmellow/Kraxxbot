import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchGuildById, fetchUserGuilds, isBotInstalledInGuild } from '@/lib/discord';
import { reconcileInstalledGuild } from '@/lib/guild-registry';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.user?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let guildId: unknown;
  try {
    ({ guildId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'A guildId is required to synchronize a server.' }, { status: 400 });
  }
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) {
    return NextResponse.json({ error: 'A valid guildId is required to synchronize a server.' }, { status: 400 });
  }

  try {
    const manageableGuilds = await fetchUserGuilds(accessToken as string);
    if (!manageableGuilds.some((guild) => guild.id === guildId)) {
      return NextResponse.json({ error: 'You are not authorized to synchronize this server.' }, { status: 403 });
    }

    if (!(await isBotInstalledInGuild(guildId))) {
      return NextResponse.json({ error: 'KRAXXBot is not installed in this server.' }, { status: 403 });
    }

    const discordGuild = await fetchGuildById(guildId);
    await reconcileInstalledGuild(discordGuild);
    return NextResponse.json({ success: true, guildId });
  } catch (error) {
    console.error('Failed to synchronize guild registry:', error);
    return NextResponse.json({ error: 'Unable to synchronize this server. Please retry.' }, { status: 502 });
  }
}
