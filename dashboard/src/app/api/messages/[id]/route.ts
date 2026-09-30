import { withMutation } from '@/lib/mutation';
import { executeDashboardMessageOperation, messageOperationHttpError, normalizeDashboardMessageInput } from '@/lib/message-operations';
import { authOptions } from '@/lib/auth';
import { fetchChannelMessage } from '@/lib/discord';
import { validateChannel } from '@/lib/destinations';
import { requireGuildAccess } from '@/lib/permissions';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  const channelId = request.nextUrl.searchParams.get('channelId');
  if (!guildId || !channelId) return NextResponse.json({ error: 'guildId and channelId required' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    await validateChannel(guildId, channelId, false);
    const message = await fetchChannelMessage(channelId, id);
    if (message.channel_id !== channelId) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    return NextResponse.json({ message });
  } catch { return NextResponse.json({ error: 'Message not found in specified channel.' }, { status: 404 }); }
}

async function mutate(request: NextRequest, params: RouteParams, operationType: 'EDIT' | 'DELETE') {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params.params;
  const key = request.headers.get('idempotency-key') || '';
  try {
    const body = operationType === 'DELETE' ? Object.fromEntries(request.nextUrl.searchParams) : await request.json() as Record<string, unknown>;
    const guildId = typeof body.guildId === 'string' ? body.guildId : request.nextUrl.searchParams.get('guildId');
    const channelId = typeof body.channelId === 'string' ? body.channelId : request.nextUrl.searchParams.get('channelId');
    if (!guildId || !channelId) return NextResponse.json({ error: 'guildId and channelId are required.' }, { status: 400 });
    body.guildId = guildId; body.channelId = channelId;
    const access = await requireGuildAccess(guildId);
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });
    const input = normalizeDashboardMessageInput(body, session.user.discordId, key, operationType, id);
    const result = await executeDashboardMessageOperation(input);
    const status = result.status === 'SUCCESS' ? 200 : result.status === 'FAILURE' ? 422 : 202;
    const message = result.status === 'FAILURE'
      ? `Discord definitively rejected this ${operationType.toLowerCase()} (${result.errorCode || 'DISCORD_REJECTED'}).`
      : result.status === 'UNKNOWN' || result.status === 'PENDING'
        ? `Operation ${result.operationId} may have reached Discord. Check /api/messages/operations/${result.operationId}?guildId=${input.guildId} or retry only with the same idempotency key; do not create a new key.`
        : undefined;
    return NextResponse.json({ operation: result, ...(message ? { error: message, message } : {}) }, { status });
  } catch (error) {
    const mapped = messageOperationHttpError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export const PATCH = withMutation('SESSION', (request, ...args) => mutate(request, args[0] as RouteParams, 'EDIT'));
export const DELETE = withMutation('SESSION', (request, ...args) => mutate(request, args[0] as RouteParams, 'DELETE'));
