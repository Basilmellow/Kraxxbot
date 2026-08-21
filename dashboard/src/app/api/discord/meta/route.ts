// KRAXX Operations Platform — Discord Guild Metadata API
// Fetches text channels and guild roles safely for dropdown selectors

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchGuildChannels, fetchGuildRoles, DiscordChannel, DiscordRole } from '@/lib/discord';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [channels, roles] = await Promise.all([
      fetchGuildChannels().catch(() => [] as DiscordChannel[]),
      fetchGuildRoles().catch(() => [] as DiscordRole[]),
    ]);

    // Channel types: 0 = GUILD_TEXT, 4 = GUILD_CATEGORY, 5 = GUILD_ANNOUNCEMENT, 15 = GUILD_FORUM
    const categoryMap = new Map<string, string>();
    channels.forEach((c) => {
      if (c.type === 4) {
        categoryMap.set(c.id, c.name);
      }
    });

    const textChannels = channels
      .filter((c) => c.type === 0 || c.type === 5)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type === 5 ? 'announcement' : 'text',
        category: c.parent_id ? categoryMap.get(c.parent_id) || 'Channels' : 'Uncategorized',
      }));

    const sanitizedRoles = (roles as DiscordRole[])
      .filter((r) => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null,
      }));

    return NextResponse.json({
      channels: textChannels,
      roles: sanitizedRoles,
    });
  } catch (error) {
    console.error('[API] Discord meta error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Discord metadata' },
      { status: 500 }
    );
  }
}
