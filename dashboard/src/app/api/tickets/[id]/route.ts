import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { NextRequest,NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { guildId, OR: [{ id: ticketId }, { channelId: ticketId }] },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket record not found.' }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error: unknown) {
    console.error('Failed to fetch ticket:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}
