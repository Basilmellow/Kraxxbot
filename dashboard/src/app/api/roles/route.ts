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
    const [roles, members] = await Promise.all([
      fetchGuildRoles(guildId),
      fetchGuildMembers(guildId, 1000).catch(() => []),
    ]);

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
        memberCount: roleCountMap.get(r.id) || 0,
        isManaged: (r as any).managed ?? false,
      }))
      .sort((a, b) => b.position - a.position);

    return NextResponse.json({ roles: enrichedRoles, total: enrichedRoles.length });
  } catch (error: any) {
    console.error('Failed to fetch guild roles:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch roles' }, { status: 500 });
  }
}
