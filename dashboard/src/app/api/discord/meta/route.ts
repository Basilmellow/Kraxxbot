// KRAXX Operations Platform — Discord Guild Metadata API
// Fetches text channels and guild roles safely for dropdown selectors

import { NextRequest, NextResponse } from 'next/server';
import { fetchGuildChannels, fetchGuildRoles, DiscordChannel, DiscordRole } from '@/lib/discord';
import { requireGuildAccess } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason, code: 'UNAUTHORIZED' }, { status: auth.status });
  }

  try {
    const [channels, roles] = await Promise.all([
      fetchGuildChannels(guildId).catch(() => [] as DiscordChannel[]),
      fetchGuildRoles(guildId).catch(() => [] as DiscordRole[]),
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
