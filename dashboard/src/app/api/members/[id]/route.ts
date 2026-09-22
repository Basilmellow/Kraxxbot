import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchGuildMember, fetchGuildRoles } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier, requireGuildAccess } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: userId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const access = await requireGuildAccess(guildId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const [discordMember, dbMember, discordRoles, tickets, tasks, moderationLogs] = await Promise.all([
      fetchGuildMember(guildId, userId).catch(() => null),
      prisma.guildMember.findFirst({ where: { discordId: userId, guildId } }),
      fetchGuildRoles(guildId).catch(() => []),
      prisma.ticket.findMany({
        where: {
          OR: [{ openerId: userId }, { claimerId: userId }],
          guildId,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.task.findMany({
        where: {
          OR: [{ assigneeId: userId }, { creatorId: userId }],
          guildId,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.moderationCase.findMany({
        where: {
          targetId: userId,
          guildId,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!discordMember && !dbMember) {
      return NextResponse.json({ error: 'Member not found in guild or database.' }, { status: 404 });
    }

    const roleMap = new Map(discordRoles.map((r) => [r.id, r]));
    const memberRoles = discordMember
      ? discordMember.roles.map((rId) => roleMap.get(rId)).filter(Boolean)
      : [];

    return NextResponse.json({
      member: {
        id: userId,
        username: discordMember?.user?.username || dbMember?.username || 'Unknown',
        displayName: discordMember?.nick || dbMember?.displayName || discordMember?.user?.username || 'Unknown',
        avatar: discordMember?.user?.avatar || dbMember?.avatar || null,
        joinedAt: discordMember?.joined_at || dbMember?.joinedAt,
        roles: memberRoles,
        roleIds: discordMember?.roles || [],
        isVerified: dbMember?.isVerified ?? false,
        verifiedAt: dbMember?.verifiedAt || null,
        roleTier: dbMember?.roleTier || 'USER',
      },
      tickets,
      tasks,
      moderationLogs,
      allRoles: discordRoles.sort((a: any, b: any) => b.position - a.position),
    });
  } catch (error: any) {
    console.error('Failed to fetch member details:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch member' }, { status: 500 });
  }
}
