import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchGuildMembers, fetchGuildRoles } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.TEAM_LEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const roleFilter = searchParams.get('role') || '';
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  try {
    const [discordMembers, dbMembers, discordRoles] = await Promise.all([
      fetchGuildMembers(Math.min(limit, 1000)),
      prisma.member.findMany(),
      fetchGuildRoles(),
    ]);

    const dbMemberMap = new Map(dbMembers.map((m) => [m.discordId, m]));
    const roleMap = new Map(discordRoles.map((r) => [r.id, r]));

    let members = discordMembers.map((dm) => {
      const user = dm.user;
      const dbRecord = user ? dbMemberMap.get(user.id) : undefined;
      const memberRoles = dm.roles.map((rId) => roleMap.get(rId)).filter(Boolean);

      return {
        id: user?.id || 'unknown',
        username: user?.username || 'Unknown',
        displayName: dm.nick || dbRecord?.displayName || user?.username || 'Unknown',
        avatar: user?.avatar || null,
        joinedAt: dm.joined_at,
        roles: memberRoles,
        roleIds: dm.roles,
        isVerified: dbRecord?.isVerified ?? false,
        department: dbRecord?.department || null,
        roleTier: dbRecord?.roleTier || 'USER',
      };
    });

    if (query) {
      members = members.filter(
        (m) =>
          m.username.toLowerCase().includes(query) ||
          m.displayName.toLowerCase().includes(query) ||
          m.id.includes(query)
      );
    }

    if (roleFilter) {
      members = members.filter((m) => m.roleIds.includes(roleFilter));
    }

    return NextResponse.json({
      members,
      total: members.length,
      roles: discordRoles.sort((a, b) => b.position - a.position),
    });
  } catch (error: any) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch guild members' }, { status: 500 });
  }
}
