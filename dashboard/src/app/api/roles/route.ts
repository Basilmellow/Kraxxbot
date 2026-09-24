import { NextRequest, NextResponse } from 'next/server';
import { fetchGuildRoles, fetchGuildMembers } from '@/lib/discord';
import { requireGuildAccess } from '@/lib/permissions';

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
    const [rolesResult, membersResult] = await Promise.allSettled([
      fetchGuildRoles(guildId),
      fetchGuildMembers(guildId, 1000),
    ]);
    if (rolesResult.status === 'rejected') throw rolesResult.reason;

    const roles = rolesResult.value;
    const members = membersResult.status === 'fulfilled' ? membersResult.value : [];
    if (membersResult.status === 'rejected') {
      console.warn('Discord roles loaded, but role member counts are unavailable:', membersResult.reason);
    }

    // Calculate member counts per role
    const roleCountMap = new Map<string, number>();
    members.forEach((m) => {
      m.roles.forEach((rId) => {
        roleCountMap.set(rId, (roleCountMap.get(rId) || 0) + 1);
      });
    });

    const enrichedRoles = roles
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null,
        position: r.position,
        permissions: r.permissions,
        memberCount: membersResult.status === 'fulfilled' ? (roleCountMap.get(r.id) || 0) : null,
        isManaged: r.managed,
      }))
      .sort((a, b) => b.position - a.position);

    return NextResponse.json({
      roles: enrichedRoles,
      total: enrichedRoles.length,
      memberCountsAvailable: membersResult.status === 'fulfilled',
    });
  } catch (error: unknown) {
    console.error('Failed to fetch guild roles:', error);
    return NextResponse.json({ error: 'Unable to load this server’s role hierarchy from Discord.' }, { status: 502 });
  }
}
