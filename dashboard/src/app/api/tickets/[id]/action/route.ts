import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireTier, RoleTier } from '@/lib/permissions';
import { logDashboardAction } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = requireTier(session, RoleTier.TEAM_LEAD);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: ticketId } = await params;
  const currentUserId = session!.user.discordId;

  try {
    const body = await request.json();
    const { action, reason } = body;

    const ticket = await prisma.ticket.findFirst({
      where: { OR: [{ id: ticketId }, { channelId: ticketId }] },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    let updatedTicket;

    switch (action) {
      case 'CLAIM': {
        updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'CLAIMED',
            claimerId: currentUserId,
          },
        });
        await logDashboardAction({
          action: 'TICKET_CLAIM',
          executorId: currentUserId,
          targetId: ticket.id,
          targetType: 'TICKET',
          details: { ticketNumber: ticket.ticketNumber, channelId: ticket.channelId },
        });
        break;
      }

      case 'UNCLAIM': {
        updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'OPEN',
            claimerId: null,
          },
        });
        await logDashboardAction({
          action: 'TICKET_UNCLAIM',
          executorId: currentUserId,
          targetId: ticket.id,
          targetType: 'TICKET',
          details: { ticketNumber: ticket.ticketNumber },
        });
        break;
      }

      case 'CLOSE': {
        updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'CLOSED',
            closedById: currentUserId,
            closedAt: new Date(),
            reason: reason || ticket.reason,
          },
        });
        await logDashboardAction({
          action: 'TICKET_CLOSE',
          executorId: currentUserId,
          targetId: ticket.id,
          targetType: 'TICKET',
          details: { ticketNumber: ticket.ticketNumber, reason },
        });
        break;
      }

      case 'REOPEN': {
        updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'OPEN',
            closedById: null,
            closedAt: null,
          },
        });
        await logDashboardAction({
          action: 'TICKET_REOPEN',
          executorId: currentUserId,
          targetId: ticket.id,
          targetType: 'TICKET',
          details: { ticketNumber: ticket.ticketNumber },
        });
        break;
      }

      case 'DELETE': {
        const deleteAuth = requireTier(session, RoleTier.MANAGEMENT_HEAD);
        if (!deleteAuth.authorized) {
          return NextResponse.json({ error: 'Only Management Head or higher can delete ticket records.' }, { status: 403 });
        }
        await prisma.ticket.delete({
          where: { id: ticket.id },
        });
        await logDashboardAction({
          action: 'TICKET_DELETE',
          executorId: currentUserId,
          targetId: ticket.id,
          targetType: 'TICKET',
          details: { ticketNumber: ticket.ticketNumber, channelId: ticket.channelId },
        });
        return NextResponse.json({ success: true, message: `Ticket #${ticket.ticketNumber} deleted.` });
      }

      default:
        return NextResponse.json({ error: `Unsupported ticket action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    console.error('Failed to execute ticket action:', error);
    return NextResponse.json({ error: error.message || 'Failed to update ticket' }, { status: 500 });
  }
}
