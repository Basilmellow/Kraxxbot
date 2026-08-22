import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: ticketId } = await params;

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { OR: [{ id: ticketId }, { channelId: ticketId }] },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket record not found.' }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error('Failed to fetch ticket:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch ticket' }, { status: 500 });
  }
}
