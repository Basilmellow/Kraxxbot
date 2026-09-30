import { createHash } from 'node:crypto';
import { validateChannel } from '@/lib/destinations';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { executeDashboardMessageOperation } from '@/lib/message-operations';
import { NextRequest, NextResponse } from 'next/server';
import { parsePollOptions, pollResults, PollService, validatePollDefinition } from '../../../../../../src/services/poll.service';

const SNOWFLAKE = /^\d{17,20}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,128}$/;

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId || !SNOWFLAKE.test(guildId)) return NextResponse.json({ error: 'Valid guildId is required.' }, { status: 400 });
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  try {
    const polls = await prisma.poll.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, take: 50 });
    const serialized = await Promise.all(polls.map(async poll => {
      const options = parsePollOptions(poll.options);
      const counts = await PollService.counts(guildId, poll.id, options.length);
      const totals = pollResults(options, counts);
      return { ...poll, options: options.map(option => option.text), results: totals.results, totalVotes: totals.totalVotes };
    }));
    return NextResponse.json({ polls: serialized, total: serialized.length });
  } catch {
    console.error('Failed to fetch polls.');
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const { guildId, question, options, channelId, durationHours = 24, idempotencyKey } = body;
  if (typeof guildId !== 'string' || !SNOWFLAKE.test(guildId) || typeof channelId !== 'string' || !SNOWFLAKE.test(channelId))
    return NextResponse.json({ error: 'A valid guild and destination channel are required.' }, { status: 400 });
  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  let definition;
  try { definition = validatePollDefinition(question, options, durationHours); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'INVALID_POLL_DEFINITION';
    return NextResponse.json({ error: message === 'INVALID_POLL_QUESTION' ? 'Question must contain 1–256 characters.'
      : message === 'DUPLICATE_POLL_OPTIONS' ? 'Poll options must be unique.'
      : message === 'INVALID_POLL_EXPIRY' ? 'Expiry must be between 1 and 168 hours.'
      : 'Provide 2–5 non-empty options, each no longer than 80 characters.' }, { status: 400 });
  }
  const labels = definition.options;
  if (typeof idempotencyKey !== 'string' || !IDEMPOTENCY_KEY.test(idempotencyKey))
    return NextResponse.json({ error: 'A valid idempotency key is required.' }, { status: 400 });

  const actorId = auth.session!.user.discordId;
  const moduleConfig = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'social' } } });
  if (!moduleConfig?.enabled) return NextResponse.json({ error: 'Community Polls is disabled for this server.' }, { status: 409 });
  await validateChannel(guildId, channelId, true, true);

  const requestHash = createHash('sha256').update(JSON.stringify({ guildId, actorId, question: definition.question, labels, channelId, isAnonymous: true, durationHours: definition.durationHours })).digest('hex');
  let published;
  try {
    published = await PollService.publish({ guildId, actorId, question: definition.question, options: labels, channelId,
      isAnonymous: true, expiresAt: definition.durationHours === null ? null : new Date(Date.now() + definition.durationHours * 60 * 60 * 1000), idempotencyKey, requestHash },
      operation => executeDashboardMessageOperation(operation));
  } catch (error) {
    if (error instanceof Error && error.message === 'POLL_IDEMPOTENCY_CONFLICT')
      return NextResponse.json({ error: 'Idempotency key was already used for a different poll request.' }, { status: 409 });
    throw error;
  }
  if (published.status === 'SUCCESS') return NextResponse.json({ success: true, poll: published.poll, operationStatus: published.status });
  if (published.status === 'FAILURE') return NextResponse.json({ error: 'Discord rejected poll delivery.', poll: published.poll, operationStatus: published.status }, { status: 502 });
  return NextResponse.json({ pollId: published.poll?.id, error: published.status === 'PENDING'
    ? 'Poll delivery is still in progress. Use the poll recovery action to check its status.'
    : 'Delivery state is uncertain; retry with the same request to safely check its status.', operationStatus: published.status }, { status: 202 });
}

export const POST = withMutation('MANAGE_ANNOUNCEMENTS', handlePOST);
