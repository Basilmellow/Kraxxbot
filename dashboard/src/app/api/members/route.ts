import { NextRequest, NextResponse } from 'next/server';
import { fetchGuildMembers, fetchGuildRoles, type DiscordRole } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { requireGuildAccess } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const roleFilter = searchParams.get('role') || '';
  const parsedLimit = Number.parseInt(searchParams.get('limit') || '1000', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 1000)) : 1000;
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const access = await requireGuildAccess(guildId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const [discordMembers, dbMembers, discordRoles] = await Promise.all([
      fetchGuildMembers(guildId, limit),
      prisma.guildMember.findMany({ where: { guildId } }),
      fetchGuildRoles(guildId),
    ]);

    const dbMemberMap = new Map(dbMembers.map((member) => [member.discordId, member]));
    const roleMap = new Map(discordRoles.map((role) => [role.id, role]));

    let members = discordMembers.map((dm) => {
      const user = dm.user;
      const dbRecord = user ? dbMemberMap.get(user.id) : undefined;
      const memberRoles = dm.roles
        .map((roleId) => roleMap.get(roleId))
        .filter((role): role is DiscordRole => role !== undefined);

      return {
        id: user?.id || 'unknown',
        username: user?.username || 'Unknown',
        displayName: dm.nick || dbRecord?.displayName || user?.username || 'Unknown',
        isBot: Boolean(user?.bot),
        avatar: user?.avatar && user?.id
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
          : dbRecord?.avatar || null,
        joinedAt: dm.joined_at,
        roles: memberRoles,
        roleIds: dm.roles,
        isVerified: dbRecord?.isVerified ?? false,
        roleTier: dbRecord?.roleTier || 'USER',
      };
    });

    const fetchedCount = members.length;

    if (query) {
      members = members.filter(
        (m) =>
          m.username.toLowerCase().includes(query) ||
          m.displayName.toLowerCase().includes(query) ||
          m.id.includes(query)
      );
    }

    if (roleFilter) {
      members = members.filter((member) => member.roleIds.includes(roleFilter));
    }

    return NextResponse.json({
      members,
      total: members.length,
      fetchedCount,
      capped: fetchedCount === limit && limit === 1000,
      roles: discordRoles.sort((a, b) => b.position - a.position),
    });
  } catch (error: unknown) {
    console.error('Failed to fetch members:', error);
    const deniedByDiscord = error instanceof Error && /Discord API Error \[403\]/.test(error.message);
    return NextResponse.json({
      error: deniedByDiscord
        ? 'Discord denied access to this server’s member list. Check the bot’s server access and the Guild Members privileged intent configuration.'
        : 'Unable to load guild members from Discord or the dashboard data store. Please retry and check service availability.',
      code: deniedByDiscord ? 'DISCORD_MEMBER_ACCESS_DENIED' : 'DISCORD_MEMBER_FETCH_FAILED',
    }, { status: 502 });
  }
}
