import { NextRequest, NextResponse } from 'next/server';
import { fetchGuildMember, fetchBotRoleContext, getRoleManageability } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { requireGuildAccess } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const [discordMember, dbMember, roleContext, tickets, tasks, moderationLogs] = await Promise.all([
      fetchGuildMember(guildId, userId),
      prisma.guildMember.findFirst({ where: { discordId: userId, guildId } }),
      fetchBotRoleContext(guildId),
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

    const capableRoles = roleContext.roles.map((role) => getRoleManageability(role, roleContext));
    const roleMap = new Map(capableRoles.map((role) => [role.id, role]));
    const memberRoles = discordMember
      ? discordMember.roles.map((rId) => roleMap.get(rId)).filter(Boolean)
      : [];

    return NextResponse.json({
      member: {
        id: userId,
        username: discordMember?.user?.username || dbMember?.username || 'Unknown',
        displayName: discordMember?.nick || dbMember?.displayName || discordMember?.user?.username || 'Unknown',
        avatar: discordMember?.user?.avatar
          ? `https://cdn.discordapp.com/avatars/${userId}/${discordMember.user.avatar}.png?size=128`
          : dbMember?.avatar || null,
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
      allRoles: capableRoles.sort((a, b) => b.position - a.position),
    });
  } catch (error: unknown) {
    console.error('Failed to fetch member details:', error);
    return NextResponse.json({ error: 'Unable to load the member dossier for this server.' }, { status: 502 });
  }
}
