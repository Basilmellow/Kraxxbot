import { executeDashboardMessageOperation } from '@/lib/message-operations';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { parsePollOptions, pollComponents, pollEmbed, PollService } from '../../../../../../../../src/services/poll.service';

async function handlePATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { guildId } = await request.json();
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) return NextResponse.json({ error: 'Valid guildId is required.' }, { status: 400 });
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  const actorId = auth.session!.user.discordId;
  const existing = await prisma.poll.findFirst({ where: { id, guildId } });
  if (!existing) return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  let closed;
  try {
    closed = await PollService.close({ guildId, pollId: id, actorId, reason: 'MANUAL' });
  } catch (error) {
    if (error instanceof Error && error.message === 'POLL_NOT_OPEN') return NextResponse.json({ error: 'Poll is not open.' }, { status: 409 });
    throw error;
  }
  const poll = closed.poll;
  if (!poll.messageId) return NextResponse.json({ error: 'Poll is closed but has no confirmed Discord message to update.', poll, operationStatus: 'UNKNOWN' }, { status: 202 });
  if (poll.messageSyncStatus === 'SYNCED' && existing.status === 'CLOSED') return NextResponse.json({ success: true, poll, operationStatus: 'SUCCESS' });

  const options = parsePollOptions(poll.options);
  const counts = await PollService.counts(guildId, id, options.length);
  const operation = await executeDashboardMessageOperation({ guildId, actorId: poll.closedBy || actorId, source: 'DASHBOARD',
    operationType: 'EDIT', idempotencyKey: `poll_close_${id}`, channelId: poll.channelId, targetMessageId: poll.messageId,
    embeds: [pollEmbed(poll.question, options, counts, true)], components: pollComponents(poll.id, options, true), mentionMode: 'NONE' });
  if (operation.status === 'SUCCESS') {
    await PollService.markMessageSynced(guildId, id);
    return NextResponse.json({ success: true, poll: { ...poll, messageSyncStatus: 'SYNCED' }, operationStatus: operation.status });
  }
  return NextResponse.json({ poll, operationStatus: operation.status, error: 'Poll is closed; Discord controls are awaiting synchronization.' }, { status: 202 });
}

export const PATCH = withMutation('MANAGE_ANNOUNCEMENTS', handlePATCH);
