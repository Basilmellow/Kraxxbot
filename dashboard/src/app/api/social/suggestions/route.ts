import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextRequest,NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') || '';
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  }

  const auth = await requireGuildAccess(guildId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || auth.reason }, { status: auth.status });
  }

  try {
    const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED'];
    if (statusFilter && statusFilter !== 'ALL' && !validStatuses.includes(statusFilter)) return NextResponse.json({ error: 'Invalid suggestion status.' }, { status: 400 });
    const whereClause: import('@prisma/client').Prisma.SuggestionWhereInput = { guildId };
    if (statusFilter && statusFilter !== 'ALL') whereClause.status = statusFilter;

    const suggestions = await prisma.suggestion.findMany({
      where: whereClause,
      select: { id: true, guildId: true, authorId: true, title: true, content: true, status: true, deliveryStatus: true,
        messageSyncStatus: true, channelId: true, messageId: true, reviewerId: true, reviewedAt: true, reviewerNotes: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const socialModule = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'social' } } });
    let socialConfig: Record<string, unknown> = {};
    try { const parsed = JSON.parse(socialModule?.config || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) socialConfig = parsed; } catch { /* report no config */ }
    return NextResponse.json({ suggestions, total: suggestions.length, moduleEnabled: Boolean(socialModule?.enabled),
      suggestionConfig: { channelId: typeof socialConfig.suggestionChannelId === 'string' ? socialConfig.suggestionChannelId : null,
        panelMessageId: typeof socialConfig.suggestionPanelMessageId === 'string' ? socialConfig.suggestionPanelMessageId : null,
        panelStatus: typeof socialConfig.suggestionPanelStatus === 'string' ? socialConfig.suggestionPanelStatus : 'NOT_CONFIGURED' } });
  } catch {
    console.error('Failed to fetch suggestions.');
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
