import { executeDashboardMessageOperation } from '@/lib/message-operations';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { parsePollOptions, PollService } from '../../../../../../../../src/services/poll.service';

async function handlePOST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { guildId } = await request.json();
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) return NextResponse.json({ error: 'Valid guildId is required.' }, { status: 400 });
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  const actorId = auth.session!.user.discordId;
  const poll = await prisma.poll.findFirst({ where: { id, guildId } });
  if (!poll) return NextResponse.json({ error: 'Poll not found.' }, { status: 404 });
  if (poll.createdBy !== actorId) return NextResponse.json({ error: 'Only the poll creator can resume its delivery request.' }, { status: 403 });
  if (!['PENDING', 'UNKNOWN'].includes(poll.status) || !poll.idempotencyKey || !poll.requestHash)
    return NextResponse.json({ error: 'This poll has no resumable delivery request.', poll }, { status: 409 });

  const published = await PollService.publish({ guildId, actorId, question: poll.question, options: parsePollOptions(poll.options).map(option => option.text),
    channelId: poll.channelId, isAnonymous: poll.isAnonymous, expiresAt: poll.expiresAt,
    idempotencyKey: poll.idempotencyKey, requestHash: poll.requestHash }, operation => executeDashboardMessageOperation(operation));
  if (published.status === 'SUCCESS') return NextResponse.json({ success: true, operationStatus: published.status, poll: published.poll });
  if (published.status === 'FAILURE') return NextResponse.json({ error: 'Discord rejected poll delivery.', poll: published.poll,
    operationStatus: published.status }, { status: 502 });
  return NextResponse.json({ pollId: published.poll?.id, operationStatus: published.status,
    error: 'Delivery is not yet confirmed. Recheck with the same request; no second message was sent.' }, { status: 202 });
}

export const POST = withMutation('MANAGE_ANNOUNCEMENTS', handlePOST);
