import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { executeDashboardMessageOperation } from '@/lib/message-operations';
import { SuggestionService, SUGGESTION_STATUSES } from '../../../../../../../src/services/suggestion.service';
import { NextRequest, NextResponse } from 'next/server';

async function handlePATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized || !access.session?.user?.discordId) return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: access.status });
  const body = await request.json();
  if (typeof body.status !== 'string' || !SUGGESTION_STATUSES.includes(body.status as typeof SUGGESTION_STATUSES[number]))
    return NextResponse.json({ error: 'A valid suggestion status is required.' }, { status: 400 });
  try {
    const { id } = await params;
    const result = await SuggestionService.transition({ guildId, actorId: access.session.user.discordId, suggestionId: id,
      status: body.status, ...(body.reviewerNotes !== undefined ? { reviewerNotes: body.reviewerNotes } : {}) },
      async () => undefined, operation => executeDashboardMessageOperation(operation));
    return NextResponse.json({ success: result.operationStatus === 'SUCCESS', suggestion: result.suggestion, operationStatus: result.operationStatus,
      ...(result.operationStatus !== 'SUCCESS' ? { error: 'Status was saved, but the Discord message update is not confirmed. Use recovery before claiming synchronization.' } : {}) },
      { status: result.operationStatus === 'SUCCESS' ? 200 : 202 });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const status = code === 'SUGGESTION_NOT_FOUND' ? 404 : code.includes('CONFLICT') || code.includes('DELIVERY_UNCONFIRMED') ? 409
      : code.startsWith('INVALID_') ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? 'Suggestion review failed. Verify its state before retrying.' : code }, { status });
  }
}

export const PATCH = withMutation('MANAGE_SUGGESTIONS', handlePATCH);
