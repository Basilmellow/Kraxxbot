import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchGuildMember, fetchGuildRoles } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.TEAM_LEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: userId } = await params;

  try {
    const [discordMember, dbMember, discordRoles, tickets, tasks, moderationLogs] = await Promise.all([
      fetchGuildMember(userId).catch(() => null),
      prisma.member.findUnique({ where: { discordId: userId } }),
      fetchGuildRoles().catch(() => []),
      prisma.ticket.findMany({
        where: { OR: [{ openerId: userId }, { claimerId: userId }] },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.task.findMany({
        where: { OR: [{ assigneeId: userId }, { creatorId: userId }] },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.moderationLog.findMany({
        where: { targetId: userId },
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
        avatar: discordMember?.user?.avatar || null,
        joinedAt: discordMember?.joined_at || dbMember?.joinedAt,
        roles: memberRoles,
        roleIds: discordMember?.roles || [],
        isVerified: dbMember?.isVerified ?? false,
        verifiedAt: dbMember?.verifiedAt || null,
        department: dbMember?.department || null,
        roleTier: dbMember?.roleTier || 'USER',
      },
      tickets,
      tasks,
      moderationLogs,
      allRoles: discordRoles.sort((a, b) => b.position - a.position),
    });
  } catch (error: any) {
    console.error('Failed to fetch member details:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch member' }, { status: 500 });
  }
}
