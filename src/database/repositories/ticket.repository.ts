import { Prisma, Ticket, TicketPanel } from '@prisma/client';
import { prisma } from '../client';

export class TicketOrphanedChannelError extends Error {
  constructor(public readonly channelId: string, public readonly auditPersisted = false) {
    super('Ticket channel exists but ticket persistence and cleanup failed.');
    this.name = 'TicketOrphanedChannelError';
  }
}

export class TicketRecoveryRequiredError extends Error {
  constructor(public readonly channelId: string, public readonly auditPersisted: boolean) {
    super('Ticket Discord and database state require manual recovery.');
    this.name = 'TicketRecoveryRequiredError';
  }
}

export class TicketCreationOutcomeUnknownError extends Error {
  constructor(public readonly creationKey: string, public readonly auditPersisted = false) {
    super('Discord ticket channel creation outcome is unknown.');
    this.name = 'TicketCreationOutcomeUnknownError';
  }
}

export interface TicketChannelProvision {
  id: string;
}

async function lockDiscordSnowflake(transaction: Prisma.TransactionClient, snowflake: string): Promise<void> {
  if (!/^\d{17,20}$/.test(snowflake)) throw new Error('Invalid ticket lock identity.');
  const value = BigInt(snowflake);
  const high = Number(BigInt.asIntN(32, value >> BigInt(32)));
  const low = Number(BigInt.asIntN(32, value));
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${high}::int, ${low}::int)`;
}

export class TicketRepository {
  // ── Ticket Panels ──────────────────────────────────────────────

  static async createPanel(data: {
    guildId: string;
    executorId: string;
    title: string;
    description: string;
    category?: string;
    channelId: string;
    messageId?: string;
  }): Promise<TicketPanel> {
    if (!data.guildId) throw new Error('Ticket tenant is required.');
    return prisma.$transaction(async (transaction) => {
      const panel = await transaction.ticketPanel.create({ data: {
        guildId: data.guildId,
        title: data.title,
        description: data.description,
        category: data.category || 'GENERAL',
        channelId: data.channelId,
        messageId: data.messageId || null,
      } });
      await transaction.auditLog.create({ data: {
        guildId: data.guildId, executorId: data.executorId, action: 'TICKET_PANEL_CREATE', targetId: panel.id,
        details: JSON.stringify({ outcome: 'SUCCESS', source: 'BOT', targetType: 'TICKET_PANEL', data: { channelId: panel.channelId, messageId: panel.messageId } }),
      } });
      return panel;
    });
  }

  static async findPanelById(id: string, guildId: string): Promise<TicketPanel | null> {
    if (!guildId) throw new Error('Ticket tenant is required.');
    return prisma.ticketPanel.findFirst({
      where: {
        id,
        guildId,
      },
    });
  }

  static async findPanelByMessageId(messageId: string, guildId: string): Promise<TicketPanel | null> {
    if (!messageId || !guildId) throw new Error('Ticket tenant and panel message are required.');
    return prisma.ticketPanel.findFirst({ where: { messageId, guildId } });
  }

  static async findPanelsByGuild(guildId: string): Promise<TicketPanel[]> {
    if (!guildId) throw new Error('Ticket tenant is required.');
    return prisma.ticketPanel.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deletePanel(id: string, guildId: string, executorId: string): Promise<boolean> {
    if (!guildId || !executorId) throw new Error('Ticket tenant and actor are required.');
    return prisma.$transaction(async (transaction) => {
      const panel = await transaction.ticketPanel.findFirst({ where: { id, guildId } });
      if (!panel) return false;
      const res = await transaction.ticketPanel.deleteMany({ where: { id, guildId } });
      if (!res.count) return false;
      await transaction.auditLog.create({ data: {
        guildId, executorId, action: 'TICKET_PANEL_DELETE', targetId: id,
        details: JSON.stringify({ outcome: 'SUCCESS', source: 'BOT', targetType: 'TICKET_PANEL', data: { channelId: panel.channelId, messageId: panel.messageId } }),
      } });
      return true;
    });
  }

  static async transitionTicket(input: {
    guildId: string; channelId: string; actorId: string; action: string;
    whereStatus: string[]; data?: Prisma.TicketUpdateManyMutationInput; delete?: boolean; source?: 'BOT' | 'DASHBOARD';
  }, discordEffect?: () => Promise<() => Promise<void>>): Promise<Ticket | null> {
    if (!input.guildId || !input.actorId || !input.channelId) throw new Error('Ticket tenant, actor and channel are required.');
    let recoveryNeeded = false;
    let transactionCallbackCompleted = false;
    let rollbackOnCommitError: (() => Promise<void>) | null = null;
    try {
      const result = await prisma.$transaction(async (transaction) => {
        await lockDiscordSnowflake(transaction, input.channelId);
        const before = await transaction.ticket.findUnique({ where: { channelId: input.channelId, guildId: input.guildId } });
        if (!before) return null;
        if (!input.whereStatus.includes(before.status)) throw new Error('TICKET_STATE_CONFLICT');
        let rollback: (() => Promise<void>) | null = null;
        try {
          if (discordEffect) {
            rollback = await discordEffect();
            rollbackOnCommitError = rollback;
          }
          if (input.delete) {
            const removed = await transaction.ticket.deleteMany({
              where: { guildId: input.guildId, channelId: input.channelId, status: { in: input.whereStatus } },
            });
            if (!removed.count) throw new Error('TICKET_STATE_CONFLICT');
            await transaction.auditLog.create({ data: {
              guildId: input.guildId, executorId: input.actorId, action: `TICKET_${input.action}`,
              targetId: before.id, details: JSON.stringify({ outcome: 'SUCCESS', source: input.source || 'BOT', targetType: 'TICKET', data: { ticketNumber: before.ticketNumber, channelId: before.channelId } }),
            } });
            transactionCallbackCompleted = true;
            return before;
          }
          if (!input.data) throw new Error('Ticket transition data is required.');
          const updated = await transaction.ticket.updateMany({
            where: { guildId: input.guildId, channelId: input.channelId, status: { in: input.whereStatus } },
            data: input.data,
          });
          if (!updated.count) throw new Error('TICKET_STATE_CONFLICT');
          const after = await transaction.ticket.findUnique({ where: { channelId: input.channelId, guildId: input.guildId } });
          if (!after) throw new Error('TICKET_STATE_CONFLICT');
          await transaction.auditLog.create({ data: {
            guildId: input.guildId, executorId: input.actorId, action: `TICKET_${input.action}`,
            targetId: after.id, details: JSON.stringify({ outcome: 'SUCCESS', source: input.source || 'BOT', targetType: 'TICKET', data: { ticketNumber: after.ticketNumber, channelId: after.channelId, status: after.status } }),
          } });
          transactionCallbackCompleted = true;
          return after;
        } catch (error) {
          if (rollback) {
            try { await rollback(); }
            catch { recoveryNeeded = true; }
            finally { rollbackOnCommitError = null; }
          }
          throw error;
        }
      });
      rollbackOnCommitError = null;
      return result;
    } catch (error) {
      const pendingRollback = rollbackOnCommitError as (() => Promise<void>) | null;
      if (transactionCallbackCompleted && pendingRollback) {
        // The database may have committed while its acknowledgement was lost. Do not
        // compensate Discord against a possibly committed state; report recovery.
        recoveryNeeded = true;
        rollbackOnCommitError = null;
      } else if (pendingRollback) {
        try { await pendingRollback(); }
        catch { recoveryNeeded = true; }
        rollbackOnCommitError = null;
      }
      if (recoveryNeeded || error instanceof TicketRecoveryRequiredError) {
        const recoveryChannelId = error instanceof TicketRecoveryRequiredError ? error.channelId : input.channelId;
        let auditPersisted = false;
        try {
          await prisma.auditLog.create({ data: {
            guildId: input.guildId, executorId: input.actorId, action: 'TICKET_TRANSITION_RECOVERY_REQUIRED', targetId: recoveryChannelId,
            details: JSON.stringify({ outcome: 'UNKNOWN', source: input.source || 'BOT', targetType: 'TICKET_CHANNEL', data: { action: input.action } }),
          } });
          auditPersisted = true;
        } catch { /* caller receives an explicit unknown result */ }
        throw new TicketRecoveryRequiredError(recoveryChannelId, auditPersisted);
      }
      throw error;
    }
  }

  // ── Tickets ────────────────────────────────────────────────────

  static async createTicketWithProvisioning(data: {
    guildId: string;
    openerId: string;
    creationKey: string;
    source?: 'BOT' | 'DASHBOARD';
    category?: string;
    subject: string;
    priority?: string;
  }, provision: (ticketNumber: number) => Promise<TicketChannelProvision>, cleanup: (channelId: string) => Promise<void>): Promise<{ ticket: Ticket; created: boolean }> {
    if (!/^\d{17,20}$/.test(data.guildId) || !/^\d{17,20}$/.test(data.openerId)) throw new Error('Ticket tenant and opener are required.');
    if (!data.creationKey || data.creationKey.length > 100) throw new Error('Ticket creation key is invalid.');

    let orphanedChannelId: string | null = null;
    let provisionedChannelId: string | null = null;
    let transactionCallbackCompleted = false;
    try {
      return await prisma.$transaction(async (transaction) => {
        // The lock is exact for a Discord snowflake and is released on commit/rollback.
        await lockDiscordSnowflake(transaction, data.guildId);

        const existing = await transaction.ticket.findUnique({
          where: { guildId_creationKey: { guildId: data.guildId, creationKey: data.creationKey } },
        });
        if (existing) {
          if (existing.openerId !== data.openerId || existing.category !== (data.category || 'GENERAL'))
            throw new Error('TICKET_IDEMPOTENCY_CONFLICT');
          return { ticket: existing, created: false };
        }

        const last = await transaction.ticket.findFirst({
          where: { guildId: data.guildId }, orderBy: { ticketNumber: 'desc' }, select: { ticketNumber: true },
        });
        const ticketNumber = (last?.ticketNumber ?? 0) + 1;
        const channel = await provision(ticketNumber);
        provisionedChannelId = channel.id;
        try {
          const ticket = await transaction.ticket.create({
            data: {
              ticketNumber,
              creationKey: data.creationKey,
              guildId: data.guildId,
              channelId: channel.id,
              openerId: data.openerId,
              category: data.category || 'GENERAL',
              subject: data.subject,
              priority: data.priority || 'MEDIUM',
              status: 'OPEN',
            },
          });
          await transaction.auditLog.create({ data: {
            guildId: data.guildId,
            executorId: data.openerId,
            action: 'TICKET_CREATE',
            targetId: ticket.id,
            details: JSON.stringify({ outcome: 'SUCCESS', source: data.source || 'BOT', targetType: 'TICKET', data: {
              ticketNumber, channelId: channel.id, category: data.category || 'GENERAL',
            } }),
          } });
          transactionCallbackCompleted = true;
          return { ticket, created: true };
        } catch (error) {
          try {
            await cleanup(channel.id);
            provisionedChannelId = null;
          } catch {
            orphanedChannelId = channel.id;
            throw error;
          }
          throw error;
        }
      }, { maxWait: 10_000, timeout: 30_000 });
    } catch (error) {
      if (transactionCallbackCompleted && provisionedChannelId) {
        // A commit acknowledgement can be lost after PostgreSQL committed. Reconcile
        // by the unique request key before deciding whether Discord cleanup is safe.
        let persisted: Ticket | null;
        try {
          persisted = await prisma.ticket.findUnique({
            where: { guildId_creationKey: { guildId: data.guildId, creationKey: data.creationKey } },
          });
        } catch {
          throw new TicketCreationOutcomeUnknownError(data.creationKey);
        }
        if (persisted?.channelId === provisionedChannelId) return { ticket: persisted, created: true };
        if (!persisted) {
          try { await cleanup(provisionedChannelId); provisionedChannelId = null; }
          catch { orphanedChannelId = provisionedChannelId; }
        } else {
          try { await cleanup(provisionedChannelId); provisionedChannelId = null; }
          catch { orphanedChannelId = provisionedChannelId; }
          if (!orphanedChannelId) throw new Error('TICKET_IDEMPOTENCY_CONFLICT');
        }
      }
      if (error instanceof TicketCreationOutcomeUnknownError) {
        let auditPersisted = false;
        try {
          await prisma.auditLog.create({ data: {
            guildId: data.guildId, executorId: data.openerId, action: 'TICKET_CREATE_OUTCOME_UNKNOWN',
            details: JSON.stringify({ outcome: 'UNKNOWN', source: data.source || 'BOT', targetType: 'TICKET_CHANNEL', data: { creationKey: data.creationKey } }),
          } });
          auditPersisted = true;
        } catch { /* the exception remains explicit to the caller */ }
        throw new TicketCreationOutcomeUnknownError(data.creationKey, auditPersisted);
      }
      const orphanId = orphanedChannelId || (error instanceof TicketOrphanedChannelError ? error.channelId : null);
      if (orphanId) {
        let auditPersisted = false;
        try {
          await prisma.auditLog.create({ data: {
            guildId: data.guildId,
            executorId: data.openerId,
            action: 'TICKET_CREATE_ORPHANED_CHANNEL',
            targetId: orphanId,
            details: JSON.stringify({ outcome: 'UNKNOWN', source: 'BOT', targetType: 'TICKET_CHANNEL', data: { creationKey: data.creationKey } }),
          } });
          auditPersisted = true;
        } catch { /* the typed error and structured caller log preserve the recovery target */ }
        throw new TicketOrphanedChannelError(orphanId, auditPersisted);
      }
      throw error;
    }
  }

  static async findByChannelId(channelId: string, guildId: string): Promise<Ticket | null> {
    if (!guildId) throw new Error('Ticket tenant is required.');
    return prisma.ticket.findUnique({
      where: { channelId, guildId },
    });
  }

  static async findById(id: string, guildId: string): Promise<Ticket | null> {
    if (!guildId) throw new Error('Ticket tenant is required.');
    return prisma.ticket.findFirst({
      where: {
        id,
        guildId,
      },
    });
  }

  static async findManyByGuild(
    guildId: string,
    filters?: {
      status?: string;
      category?: string;
      openerId?: string;
      claimerId?: string | null;
      limit?: number;
    }
  ): Promise<Ticket[]> {
    if (!guildId) throw new Error('Ticket tenant is required.');
    return prisma.ticket.findMany({
      where: {
        guildId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.openerId ? { openerId: filters.openerId } : {}),
        ...(filters?.claimerId !== undefined ? { claimerId: filters.claimerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  static async recordTranscript(input: { guildId: string; channelId: string; actorId: string; url: string }): Promise<boolean> {
    if (!input.guildId || !input.channelId || !input.actorId || !input.url) throw new Error('Ticket transcript context is incomplete.');
    return prisma.$transaction(async (transaction) => {
      const ticket = await transaction.ticket.findUnique({ where: { channelId: input.channelId, guildId: input.guildId } });
      if (!ticket) return false;
      const updated = await transaction.ticket.updateMany({
        where: { guildId: input.guildId, channelId: input.channelId },
        data: { transcriptUrl: input.url },
      });
      if (!updated.count) return false;
      await transaction.auditLog.create({ data: {
        guildId: input.guildId, executorId: input.actorId, action: 'TICKET_TRANSCRIPT_ARCHIVED', targetId: ticket.id,
        details: JSON.stringify({ outcome: 'SUCCESS', source: 'BOT', targetType: 'TICKET', data: { ticketNumber: ticket.ticketNumber, channelId: ticket.channelId } }),
      } });
      return true;
    });
  }
}
