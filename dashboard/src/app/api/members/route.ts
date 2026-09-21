import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchGuildMembers, fetchGuildRoles } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const roleFilter = searchParams.get('role') || '';
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const guildId = searchParams.get('guildId') || process.env.GUILD_ID || '';

  try {
    const [discordMembers, dbMembers, discordRoles] = await Promise.all([
      guildId ? fetchGuildMembers(guildId, Math.min(limit, 1000)).catch(() => []) : Promise.resolve([]),
      prisma.guildMember.findMany({ where: guildId ? { guildId } : {} }),
      fetchGuildRoles(guildId).catch(() => []),
    ]);

    const dbMemberMap = new Map(dbMembers.map((m: any) => [m.discordId, m]));
    const roleMap = new Map(discordRoles.map((r: any) => [r.id, r]));

    let members = discordMembers.map((dm: any) => {
      const user = dm.user;
      const dbRecord = user ? dbMemberMap.get(user.id) : undefined;
      const memberRoles = dm.roles.map((rId: string) => roleMap.get(rId)).filter(Boolean);

      return {
        id: user?.id || 'unknown',
        username: user?.username || 'Unknown',
        displayName: dm.nick || dbRecord?.displayName || user?.username || 'Unknown',
        avatar: user?.avatar || dbRecord?.avatar || null,
        joinedAt: dm.joined_at,
        roles: memberRoles,
        roleIds: dm.roles,
        isVerified: dbRecord?.isVerified ?? false,
        roleTier: dbRecord?.roleTier || 'USER',
      };
    });

    if (query) {
      members = members.filter(
        (m: any) =>
          m.username.toLowerCase().includes(query) ||
          m.displayName.toLowerCase().includes(query) ||
          m.id.includes(query)
      );
    }

    if (roleFilter) {
      members = members.filter((m: any) => m.roleIds.includes(roleFilter));
    }

    return NextResponse.json({
      members,
      total: members.length,
      roles: discordRoles.sort((a: any, b: any) => b.position - a.position),
    });
  } catch (error: any) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch guild members' }, { status: 500 });
  }
}
