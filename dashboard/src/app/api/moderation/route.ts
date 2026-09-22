import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  kickGuildMember,
  banGuildMember,
  unbanGuildMember,
  timeoutGuildMember,
  fetchGuildMember,
} from '@/lib/discord';
import { requireTier, RoleTier, resolveRoleTier, requireGuildAccess } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const actionFilter = searchParams.get('action') || '';
  const targetId = searchParams.get('targetId') || '';
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const access = await requireGuildAccess(guildId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const whereClause: any = { guildId };
    if (actionFilter && actionFilter !== 'ALL') whereClause.action = actionFilter;
    if (targetId) whereClause.targetId = targetId;

    const logs = await prisma.moderationCase.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs, total: logs.length });
  } catch (error: any) {
    console.error('Failed to fetch moderation logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch moderation logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { targetId, action, reason, durationSeconds = 3600, guildId: bodyGuildId } = body; // action: 'WARN' | 'TIMEOUT' | 'KICK' | 'BAN' | 'UNBAN'
    const guildId = bodyGuildId || request.nextUrl.searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    }

    const access = await requireGuildAccess(guildId);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!targetId || !action) {
      return NextResponse.json({ error: 'Target user ID and moderation action are required.' }, { status: 400 });
    }

    const currentUserId = session!.user.discordId;
    const currentUserTier = session!.user.roleTier ?? RoleTier.USER;

    // Safety check: Fetch target member to ensure hierarchy protection
    if (action !== 'UNBAN') {
      const targetMember = await fetchGuildMember(guildId, targetId).catch(() => null);
      if (targetMember) {
        const targetTier = resolveRoleTier(targetMember.roles);
        if (targetTier >= currentUserTier) {
          return NextResponse.json(
            { error: `Hierarchy Violation: You cannot moderate a member at or above your role tier (${targetTier} >= ${currentUserTier}).` },
            { status: 403 }
          );
        }
      }
    }

    const auditReason = `Moderation [${action}] by ${session!.user.name}: ${reason || 'No reason provided'}`;

    // Execute Discord REST Action
    switch (action) {
      case 'TIMEOUT': {
        await timeoutGuildMember(guildId, targetId, durationSeconds, auditReason);
        break;
      }
      case 'KICK': {
        await kickGuildMember(guildId, targetId, auditReason);
        break;
      }
      case 'BAN': {
        await banGuildMember(guildId, targetId, auditReason, 0);
        break;
      }
      case 'UNBAN': {
        await unbanGuildMember(guildId, targetId, auditReason);
        break;
      }
      case 'WARN': {
        // Warn is an administrative record logged to database
        break;
      }
      default:
        return NextResponse.json({ error: `Unsupported moderation action: ${action}` }, { status: 400 });
    }

    // Get next case number for this guild
    const lastCase = await prisma.moderationCase.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
    });
    const nextCaseNumber = (lastCase?.caseNumber || 0) + 1;

    // Record Moderation Case
    const modLog = await prisma.moderationCase.create({
      data: {
        caseNumber: nextCaseNumber,
        guildId,
        targetId,
        moderatorId: currentUserId,
        moderatorTag: session!.user.name || null,
        action,
        reason: reason || null,
        durationSeconds: action === 'TIMEOUT' ? durationSeconds : null,
      },
    });

    await logDashboardAction({
      guildId,
      action: `MODERATION_${action}`,
      executorId: currentUserId,
      targetId,
      targetType: 'USER',
      details: { action, reason, durationSeconds, caseNumber: nextCaseNumber },
    });

    return NextResponse.json({ success: true, log: modLog });
  } catch (error: any) {
    console.error('Failed to execute moderation action:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute moderation action' }, { status: 500 });
  }
}
