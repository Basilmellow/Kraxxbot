import { randomUUID } from 'node:crypto';
import { Client } from 'discord.js';
import type { Message } from 'discord.js';
import cron from 'node-cron';
import { prisma } from '../database/client';
import { SchedulerRepository } from '../database/repositories/scheduler.repository';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { workerDestination } from '../security/destination';
import { createAuditDetails } from './audit-event';
import { deliveryFailurePolicy, retryDecision, safeDeliveryError, SCHEDULER_LEASE_MS } from './scheduler-policy';
import { logger } from '../utils/logger';
import { AutomationExecutionService } from './automation-execution.service';
import { MessageOperationService, type MessageOperationAdapter } from './message-operation.service';
import { PollService, parsePollOptions, pollComponents, pollEmbed } from './poll.service';

const RETRY_MESSAGE = 'Delivery failed after the configured retry policy.';

async function recordDeliveryAudit(input: {
  guildId: string;
  actorId: string;
  targetId: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE';
  attempt: number;
  maxAttempts: number;
  errorType?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        guildId: input.guildId,
        executorId: input.actorId,
        targetId: input.targetId,
        action: input.action,
        details: createAuditDetails({
          source: 'BOT',
          targetType: input.action === 'REMINDER_DELIVERY' ? 'REMINDER' : 'SCHEDULED_ANNOUNCEMENT',
          outcome: input.outcome,
          metadata: {
            attempt: input.attempt,
            maxAttempts: input.maxAttempts,
            ...(input.errorType ? { errorType: input.errorType } : {}),
          },
        }),
      },
    });
  } catch (error) {
    logger.error({ guildId: input.guildId, action: input.action, outcome: input.outcome, errorType: safeDeliveryError(error) }, 'Scheduled delivery audit write failed');
  }
}

export class SchedulerService {
  private static isRunning = false;
  private static busy = false;
  private static lastTick = 0;
  private static failed = false;

  static health(): string {
    return !this.isRunning ? 'OFFLINE' : !this.lastTick ? 'UNKNOWN' : this.failed || Date.now() - this.lastTick > 150000 ? 'DEGRADED' : 'OPERATIONAL';
  }

  static start(client: Client): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('⏰ Durable scheduled delivery worker initialized');

    cron.schedule('* * * * *', async () => {
      if (this.busy) return;
      this.busy = true;
      this.failed = false;
      const now = new Date();
      try {
        await this.processReminders(client, now);
        await this.processAnnouncements(client, now);
        await AutomationExecutionService.processDue(client, now);
        await PollService.expireDue(now);
        await this.syncClosedPollMessages(client);
      } catch (error) {
        this.failed = true;
        logger.error({ errorType: safeDeliveryError(error) }, 'Scheduled delivery scan failed');
      } finally {
        this.busy = false;
        this.lastTick = Date.now();
      }
    });
  }

  private static async syncClosedPollMessages(client: Client): Promise<void> {
    const polls = await prisma.poll.findMany({ where: { status: 'CLOSED', messageSyncStatus: 'NEEDS_UPDATE', messageId: { not: null } }, take: 100 });
    for (const poll of polls) {
      try {
        const options = parsePollOptions(poll.options);
        const counts = await PollService.counts(poll.guildId, poll.id, options.length);
        let target: Awaited<ReturnType<typeof workerDestination>> | undefined;
        let message: Message | undefined;
        const adapter: MessageOperationAdapter = {
          async authorize(input) {
            target = await workerDestination(client, input.guildId, input.channelId);
            message = await target.messages.fetch(input.targetMessageId!);
            if (message.channelId !== input.channelId || message.guildId !== input.guildId || message.author.id !== client.user?.id)
              throw new Error('PollMessageOwnershipMismatch');
          },
          async send() { throw new Error('Poll message update cannot send'); },
          async edit(args) {
            if (!target || !message) throw new Error('Poll message was not authorized');
            const updated = await message.edit({ content: args.content, embeds: args.embeds as never, components: args.components as never,
              allowedMentions: args.allowedMentions as never });
            return { messageId: updated.id };
          },
          async delete() { throw new Error('Poll message update cannot delete'); },
        };
        const result = await MessageOperationService.execute({ guildId: poll.guildId, actorId: poll.closedBy || poll.createdBy,
          source: 'BOT', operationType: 'EDIT', idempotencyKey: `poll_close_${poll.id}`, channelId: poll.channelId,
          targetMessageId: poll.messageId!, embeds: [pollEmbed(poll.question, options, counts, true)],
          components: pollComponents(poll.id, options, true), mentionMode: 'NONE' }, adapter);
        if (result.status === 'SUCCESS') await PollService.markMessageSynced(poll.guildId, poll.id);
        else this.failed = true;
      } catch (error) {
        this.failed = true;
        logger.warn({ guildId: poll.guildId, pollId: poll.id, errorType: safeDeliveryError(error) }, 'Closed poll message synchronization is pending');
      }
    }
  }

  private static async processReminders(client: Client, now: Date): Promise<void> {
    const due = await SchedulerRepository.findDueReminders(now);
    for (const reminder of due) {
      if (reminder.status === 'PROCESSING' && reminder.attempts >= reminder.maxAttempts) {
        const expired = await SchedulerRepository.failExpiredReminder(reminder, now);
        if (expired.count) {
          this.failed = true;
          await recordDeliveryAudit({ guildId: reminder.guildId, actorId: reminder.createdBy, targetId: reminder.id,
            action: 'REMINDER_DELIVERY', outcome: 'FAILURE', attempt: reminder.attempts, maxAttempts: reminder.maxAttempts, errorType: 'LeaseExpired' });
        }
        continue;
      }

      const leaseToken = randomUUID();
      const leaseExpiresAt = new Date(now.getTime() + SCHEDULER_LEASE_MS);
      const claimed = await SchedulerRepository.claimReminder(reminder, now, leaseToken, leaseExpiresAt);
      if (!claimed.count) continue;
      const attempt = reminder.attempts + 1;

      try {
        let sentMessageId: string | undefined;
        const embed = KraxxEmbedBuilder.createHeader(`REMINDER: ${reminder.title}`, 'SCHEDULED ALERT');
        embed.setDescription(reminder.message);
        const messageOptions = {
          embeds: [embed],
          allowedMentions: { parse: [] as never[] },
          nonce: reminder.idempotencyKey.slice(0, 25),
          enforceNonce: true,
        };

        if (reminder.targetType === 'USER') {
          if (reminder.targetId !== reminder.createdBy) throw new Error('ReminderRecipientMismatch');
          const guild = await client.guilds.fetch(reminder.guildId);
          const user = (await guild.members.fetch(reminder.targetId)).user;
          const sent = await user.send(messageOptions);
          sentMessageId = sent.id;
        } else if (reminder.targetType === 'CHANNEL') {
          const channel = await workerDestination(client, reminder.guildId, reminder.targetId);
          const sent = await channel.send(messageOptions);
          sentMessageId = sent.id;
        } else {
          throw new Error('UnknownReminderDestination');
        }

        const completed = await SchedulerRepository.completeReminder(reminder.id, reminder.guildId, leaseToken);
        if (!completed.count) {
          logger.warn({ guildId: reminder.guildId, reminderId: reminder.id, messageId: sentMessageId }, 'Reminder delivered after its lease was no longer owned');
          continue;
        }
        await recordDeliveryAudit({ guildId: reminder.guildId, actorId: reminder.createdBy, targetId: reminder.id,
          action: 'REMINDER_DELIVERY', outcome: 'SUCCESS', attempt, maxAttempts: reminder.maxAttempts });
        logger.info({ guildId: reminder.guildId, reminderId: reminder.id, messageId: sentMessageId, attempt }, 'Dispatched scheduled reminder');
      } catch (error) {
        const errorType = safeDeliveryError(error);
        const decision = retryDecision(attempt, reminder.maxAttempts, 'ACTIVE', new Date(), deliveryFailurePolicy(error));
        const updated = await SchedulerRepository.failReminder(reminder.id, reminder.guildId, leaseToken, decision, errorType);
        if (updated.count) {
          this.failed = true;
          await recordDeliveryAudit({ guildId: reminder.guildId, actorId: reminder.createdBy, targetId: reminder.id,
            action: 'REMINDER_DELIVERY', outcome: 'FAILURE', attempt, maxAttempts: reminder.maxAttempts, errorType });
          logger.warn({ guildId: reminder.guildId, reminderId: reminder.id, attempt, maxAttempts: reminder.maxAttempts, nextAttemptAt: decision.nextAttemptAt, errorType }, 'Reminder delivery attempt failed');
        } else {
          logger.warn({ guildId: reminder.guildId, reminderId: reminder.id }, 'Reminder delivery failed after its lease was no longer owned');
        }
      }
    }
  }

  private static async processAnnouncements(client: Client, now: Date): Promise<void> {
    const due = await SchedulerRepository.findDueAnnouncements(now);
    for (const announcement of due) {
      if (announcement.status === 'PROCESSING' && announcement.attempts >= announcement.maxAttempts) {
        const expired = await SchedulerRepository.failExpiredAnnouncement(announcement, now);
        if (expired.count) {
          this.failed = true;
          await recordDeliveryAudit({ guildId: announcement.guildId, actorId: announcement.createdBy, targetId: announcement.id,
            action: 'ANNOUNCEMENT_DELIVERY', outcome: 'FAILURE', attempt: announcement.attempts, maxAttempts: announcement.maxAttempts, errorType: 'LeaseExpired' });
        }
        continue;
      }

      const leaseToken = randomUUID();
      const leaseExpiresAt = new Date(now.getTime() + SCHEDULER_LEASE_MS);
      const claimed = await SchedulerRepository.claimAnnouncement(announcement, now, leaseToken, leaseExpiresAt);
      if (!claimed.count) continue;
      const attempt = announcement.attempts + 1;

      try {
        const channel = await workerDestination(client, announcement.guildId, announcement.channelId);
        let content = announcement.content || undefined;
        if (announcement.mentionType === 'EVERYONE') content = content ? `@everyone\n${content}` : '@everyone';
        else if (announcement.mentionType === 'HERE') content = content ? `@here\n${content}` : '@here';
        else if (announcement.mentionType === 'ROLE' && announcement.mentionRoleId) {
          const mention = `<@&${announcement.mentionRoleId}>`;
          content = content ? `${mention}\n${content}` : mention;
        }

        let embeds: object[] = [];
        if (announcement.embedPayload) {
          const parsed: unknown = JSON.parse(announcement.embedPayload);
          if (!Array.isArray(parsed)) throw new Error('InvalidAnnouncementEmbeds');
          embeds = parsed;
        }

        const allowedMentions = announcement.mentionType === 'ROLE' && announcement.mentionRoleId
          ? { parse: [] as never[], roles: [announcement.mentionRoleId] }
          : announcement.mentionType === 'EVERYONE' || announcement.mentionType === 'HERE'
            ? { parse: ['everyone'] as never[] }
            : { parse: [] as never[] };
        const sentMessage = await channel.send({
          content,
          embeds,
          allowedMentions,
          nonce: announcement.idempotencyKey.slice(0, 25),
          enforceNonce: true,
        });
        const sentAt = new Date();
        const completed = await SchedulerRepository.completeAnnouncement(
          announcement.id, announcement.guildId, leaseToken, sentMessage.id, sentAt,
          {
            title: announcement.title || 'Scheduled Announcement',
            content: announcement.content || 'Announcement',
            department: announcement.department,
            type: announcement.announcementType,
            authorId: announcement.createdBy,
            channelId: announcement.channelId,
            mentionRole: announcement.mentionRoleId,
          },
        );
        if (!completed.count) {
          logger.warn({ guildId: announcement.guildId, announcementId: announcement.id, messageId: sentMessage.id }, 'Announcement delivered after its lease was no longer owned');
          continue;
        }
        await recordDeliveryAudit({ guildId: announcement.guildId, actorId: announcement.createdBy, targetId: announcement.id,
          action: 'ANNOUNCEMENT_DELIVERY', outcome: 'SUCCESS', attempt, maxAttempts: announcement.maxAttempts });
        logger.info({ guildId: announcement.guildId, announcementId: announcement.id, channelId: announcement.channelId, attempt }, 'Dispatched scheduled announcement');
      } catch (error) {
        const errorType = safeDeliveryError(error);
        const decision = retryDecision(attempt, announcement.maxAttempts, 'PENDING', new Date(), deliveryFailurePolicy(error));
        const updated = await SchedulerRepository.failAnnouncement(announcement.id, announcement.guildId, leaseToken,
          decision, errorType, RETRY_MESSAGE);
        if (updated.count) {
          this.failed = true;
          await recordDeliveryAudit({ guildId: announcement.guildId, actorId: announcement.createdBy, targetId: announcement.id,
            action: 'ANNOUNCEMENT_DELIVERY', outcome: 'FAILURE', attempt, maxAttempts: announcement.maxAttempts, errorType });
          logger.warn({ guildId: announcement.guildId, announcementId: announcement.id, attempt, maxAttempts: announcement.maxAttempts, nextAttemptAt: decision.nextAttemptAt, errorType }, 'Scheduled announcement delivery attempt failed');
        } else {
          logger.warn({ guildId: announcement.guildId, announcementId: announcement.id }, 'Announcement delivery failed after its lease was no longer owned');
        }
      }
    }
  }
}
