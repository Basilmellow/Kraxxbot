"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketDomainService = void 0;
const ticket_repository_1 = require("../database/repositories/ticket.repository");
/** Canonical persistence/state-transition boundary shared by dashboard and bot entry points. */
class TicketDomainService {
    static assertContext(guildId, actor) {
        if (!guildId || !actor.id || !actor.authorized)
            throw new Error('Ticket operation is not permitted.');
    }
    static async find(guildId, identity) {
        if (!guildId || !identity)
            throw new Error('Ticket tenant and identity are required.');
        const byId = await ticket_repository_1.TicketRepository.findById(identity, guildId);
        return byId || ticket_repository_1.TicketRepository.findByChannelId(identity, guildId);
    }
    static async list(guildId, filters) {
        if (!guildId)
            throw new Error('Ticket tenant is required.');
        return ticket_repository_1.TicketRepository.findManyByGuild(guildId, filters);
    }
    static async create(input, provision, cleanup) {
        this.assertContext(input.guildId, { id: input.actorId, authorized: input.authorized });
        return ticket_repository_1.TicketRepository.createTicketWithProvisioning({
            guildId: input.guildId,
            openerId: input.actorId,
            creationKey: input.creationKey,
            source: input.source,
            category: input.category,
            subject: input.subject,
        }, provision, cleanup);
    }
    static async recordTranscript(guildId, channelId, actorId, url) {
        if (!guildId || !channelId || !actorId || !url)
            throw new Error('Ticket transcript context is incomplete.');
        return ticket_repository_1.TicketRepository.recordTranscript({ guildId, channelId, actorId, url });
    }
    static async transition(guildId, identity, actor, action, reason, discordEffect) {
        this.assertContext(guildId, actor);
        const ticket = await this.find(guildId, identity);
        if (!ticket)
            return null;
        const transition = action === 'CLAIM'
            ? { whereStatus: ['OPEN'], data: { status: 'CLAIMED', claimerId: actor.id } }
            : action === 'UNCLAIM'
                ? { whereStatus: ['CLAIMED'], data: { status: 'OPEN', claimerId: null } }
                : action === 'CLOSE'
                    ? { whereStatus: ['OPEN', 'CLAIMED'], data: { status: 'CLOSED', closedById: actor.id, closedAt: new Date(), reason: reason || ticket.reason } }
                    : action === 'REOPEN'
                        ? { whereStatus: ['CLOSED'], data: { status: 'OPEN', closedById: null, closedAt: null } }
                        : { whereStatus: ['CLOSED'], data: undefined };
        return ticket_repository_1.TicketRepository.transitionTicket({
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
exports.TicketDomainService = TicketDomainService;
