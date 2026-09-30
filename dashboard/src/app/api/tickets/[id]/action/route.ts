import { authOptions } from '@/lib/auth';
import { validateChannel } from '@/lib/destinations';
import { setTicketAccess } from '@/lib/discord';
import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { TicketDomainService } from '@/lib/ticket-domain';
import { TicketRecoveryRequiredError } from '../../../../../../../src/database/repositories/ticket.repository';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest,NextResponse } from 'next/server';

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  const { id: ticketId } = await params;
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const guildAccess = await requireGuildAccess(guildId);
  if (!guildAccess.authorized) return NextResponse.json({ error: guildAccess.error }, { status: guildAccess.status });
  const currentUserId = session!.user.discordId;
  const moduleState = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'tickets' } } });
  if (moduleState && !moduleState.enabled) return NextResponse.json({ error: 'Ticket actions are disabled for this server.' }, { status: 403 });

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Object.keys(body).some((key) => !['action', 'reason'].includes(key)))
      return NextResponse.json({ error: 'Invalid ticket action payload.' }, { status: 400 });
    const { action, reason } = body;
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500))
      return NextResponse.json({ error: 'Invalid ticket reason.' }, { status: 400 });

    const ticket = await TicketDomainService.find(guildId, ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    if (!['CLAIM','UNCLAIM','CLOSE','REOPEN','DELETE'].includes(action)) return NextResponse.json({error:'Invalid ticket action.'},{status:400});
    if (action === 'DELETE') return NextResponse.json({error:'Use the Discord ticket command to archive and delete the channel safely.'},{status:409});
    const expected = action === 'CLAIM' || action === 'UNCLAIM'
      ? action === 'CLAIM' ? ['OPEN'] : ['CLAIMED']
      : action === 'CLOSE' ? ['OPEN', 'CLAIMED'] : ['CLOSED'];
    if (!expected.includes(ticket.status)) return NextResponse.json({ error: 'Ticket state changed; refresh before retrying.' }, { status: 409 });
    await validateChannel(guildId, ticket.channelId);
    const effect = action === 'CLOSE' || action === 'REOPEN'
      ? async () => {
        try { await setTicketAccess(guildId, ticket.channelId, ticket.openerId, action === 'REOPEN'); }
        catch (error) {
          try { await setTicketAccess(guildId, ticket.channelId, ticket.openerId, ticket.status !== 'CLOSED'); }
          catch { throw new TicketRecoveryRequiredError(ticket.channelId, false); }
          throw error;
        }
        return async () => setTicketAccess(guildId, ticket.channelId, ticket.openerId, ticket.status !== 'CLOSED');
      }
      : undefined;
    const updatedTicket = await TicketDomainService.transition(guildId, ticket.id, { id: currentUserId, authorized: true, source: 'DASHBOARD' }, action, reason, effect);
    if (!updatedTicket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: unknown) {
    console.error('Failed to execute ticket action; Discord details omitted.');
    if (error instanceof TicketRecoveryRequiredError) return NextResponse.json({ error: 'Ticket transition requires manual recovery.', code: 'TICKET_RECOVERY_REQUIRED', channelId: error.channelId, auditRecorded: error.auditPersisted }, { status: 503 });
    if (error instanceof Error && error.message === 'TICKET_STATE_CONFLICT') return NextResponse.json({ error: 'Ticket state changed; refresh before retrying.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

export const POST = withMutation('MANAGE_TICKETS', handlePOST);
