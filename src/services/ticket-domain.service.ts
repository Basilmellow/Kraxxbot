import type { Ticket } from '@prisma/client';
import { TicketRepository } from '../database/repositories/ticket.repository';

export type TicketTransition = 'CLAIM' | 'UNCLAIM' | 'CLOSE' | 'REOPEN' | 'DELETE';

export interface TicketActor {
  id: string;
  authorized: boolean;
  source?: 'BOT' | 'DASHBOARD';
}

/** Canonical persistence/state-transition boundary shared by dashboard and bot entry points. */
export class TicketDomainService {
  private static assertContext(guildId: string, actor: TicketActor): void {
    if (!guildId || !actor.id || !actor.authorized) throw new Error('Ticket operation is not permitted.');
  }

  static async find(guildId: string, identity: string): Promise<Ticket | null> {
    if (!guildId || !identity) throw new Error('Ticket tenant and identity are required.');
    const byId = await TicketRepository.findById(identity, guildId);
    return byId || TicketRepository.findByChannelId(identity, guildId);
  }

  static async list(guildId: string, filters?: Parameters<typeof TicketRepository.findManyByGuild>[1]): Promise<Ticket[]> {
    if (!guildId) throw new Error('Ticket tenant is required.');
    return TicketRepository.findManyByGuild(guildId, filters);
  }

  static async create(
    input: { guildId: string; actorId: string; authorized: boolean; creationKey: string; category: string; subject: string; source?: 'BOT' | 'DASHBOARD' },
    provision: Parameters<typeof TicketRepository.createTicketWithProvisioning>[1],
    cleanup: Parameters<typeof TicketRepository.createTicketWithProvisioning>[2]
  ) {
    this.assertContext(input.guildId, { id: input.actorId, authorized: input.authorized });
    return TicketRepository.createTicketWithProvisioning({
      guildId: input.guildId,
      openerId: input.actorId,
      creationKey: input.creationKey,
      source: input.source,
      category: input.category,
      subject: input.subject,
    }, provision, cleanup);
  }

  static async recordTranscript(guildId: string, channelId: string, actorId: string, url: string): Promise<boolean> {
    if (!guildId || !channelId || !actorId || !url) throw new Error('Ticket transcript context is incomplete.');
    return TicketRepository.recordTranscript({ guildId, channelId, actorId, url });
  }

  static async transition(
    guildId: string, identity: string, actor: TicketActor, action: TicketTransition, reason?: string,
    discordEffect?: () => Promise<() => Promise<void>>,
  ): Promise<Ticket | null> {
    this.assertContext(guildId, actor);
    const ticket = await this.find(guildId, identity);
    if (!ticket) return null;
    const transition = action === 'CLAIM'
      ? { whereStatus: ['OPEN'], data: { status: 'CLAIMED', claimerId: actor.id } }
      : action === 'UNCLAIM'
        ? { whereStatus: ['CLAIMED'], data: { status: 'OPEN', claimerId: null } }
        : action === 'CLOSE'
          ? { whereStatus: ['OPEN', 'CLAIMED'], data: { status: 'CLOSED', closedById: actor.id, closedAt: new Date(), reason: reason || ticket.reason } }
          : action === 'REOPEN'
            ? { whereStatus: ['CLOSED'], data: { status: 'OPEN', closedById: null, closedAt: null } }
            : { whereStatus: ['CLOSED'], data: undefined };
    return TicketRepository.transitionTicket({
      guildId,
      channelId: ticket.channelId,
      actorId: actor.id,
      action,
      whereStatus: transition.whereStatus,
      data: transition.data,
      delete: action === 'DELETE',
      source: actor.source,
    }, discordEffect);
  }
}
