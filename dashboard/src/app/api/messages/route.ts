import { withMutation } from '@/lib/mutation';
import { executeDashboardMessageOperation, messageOperationHttpError, normalizeDashboardMessageInput } from '@/lib/message-operations';
import { authOptions } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/permissions';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

async function handlePOST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = request.headers.get('idempotency-key') || '';
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.guildId !== 'string') return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
    const access = await requireGuildAccess(body.guildId);
    if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });
    const input = normalizeDashboardMessageInput(body, session.user.discordId, key, 'SEND');
    const result = await executeDashboardMessageOperation(input);
    const status = result.status === 'SUCCESS' ? 200 : result.status === 'FAILURE' ? 422 : 202;
    const message = result.status === 'FAILURE'
      ? `Discord definitively rejected this message operation (${result.errorCode || 'DISCORD_REJECTED'}).`
      : result.status === 'UNKNOWN' || result.status === 'PENDING'
        ? `Operation ${result.operationId} may have reached Discord. Check /api/messages/operations/${result.operationId}?guildId=${input.guildId} or retry only with the same idempotency key; do not create a new key.`
        : undefined;
    return NextResponse.json({ operation: result, channelId: input.channelId, ...(message ? { error: message, message } : {}) }, { status });
  } catch (error) {
    const mapped = messageOperationHttpError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export const POST = withMutation('SESSION', handlePOST);
