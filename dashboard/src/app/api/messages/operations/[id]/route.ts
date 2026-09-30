import { authOptions } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/permissions';
import { MessageOperationService } from '../../../../../../../src/services/message-operation.service';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Valid guildId and operation ID are required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized) return NextResponse.json({ error: access.error }, { status: access.status });
  const operation = await MessageOperationService.getStatus(id, guildId, session.user.discordId, 'DASHBOARD');
  if (!operation) return NextResponse.json({ error: 'Operation not found.' }, { status: 404 });
  return NextResponse.json({ operation: {
    operationId: operation.id, operationType: operation.operationType, channelId: operation.channelId,
    targetMessageId: operation.targetMessageId, messageId: operation.discordMessageId, status: operation.status,
    errorCode: operation.errorCode, alreadyDeleted: operation.wasAlreadyDeleted,
    createdAt: operation.createdAt, updatedAt: operation.updatedAt,
  } });
}
