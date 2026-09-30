import { authOptions } from '@/lib/auth';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { runModeration, moderationFailureCode } from '../../../../../src/services/moderation.service';
import { createModerationAdapter } from '../../../../../src/services/moderation-discord';
import { ModerationError } from '../../../../../src/services/moderation-contract';
import { PolicyError } from '../../../../../src/security/policy';
import { DiscordApiError } from '@/lib/discord-transport';

export async function GET(request: NextRequest) {
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
    const whereClause: { guildId: string; action?: string; targetId?: string } = { guildId };
    if (actionFilter && actionFilter !== 'ALL') whereClause.action = actionFilter;
    if (targetId) whereClause.targetId = targetId;

    const logs = await prisma.moderationCase.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs, total: logs.length });
  } catch {
    console.error('MODERATION_HISTORY_READ_FAILED', { guildId });
    return NextResponse.json({ error: 'Failed to fetch moderation logs' }, { status: 500 });
  }
}


async function handlePOST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const guildId = body.guildId || request.nextUrl.searchParams.get('guildId');
    // The mutation wrapper has already validated guild access and conflicting context.
    const record = await runModeration(prisma, createModerationAdapter(process.env.DISCORD_BOT_TOKEN || ''),
      { ...body, guildId }, session.user.discordId, 'DASHBOARD');
    const status = record.status === 'SUCCESS' ? 200 : 409;
    return NextResponse.json({ success: record.status === 'SUCCESS', log: record,
      ...(record.status !== 'SUCCESS' ? { error: record.errorCode || 'Attempt pending verification. Do not retry with a new request.' } : {}) }, { status });
  } catch (error) {
    const status = error instanceof ModerationError ? error.status : error instanceof PolicyError ? 403
      : error instanceof DiscordApiError ? (error.status === 429 ? 429 : 502) : 503;
    return NextResponse.json({ error: moderationFailureCode(error) }, { status });
  }
}
export const POST = withMutation('MODERATE_MEMBER', handlePOST);
