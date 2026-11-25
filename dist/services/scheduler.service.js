"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const node_crypto_1 = require("node:crypto");
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("../database/client");
const scheduler_repository_1 = require("../database/repositories/scheduler.repository");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const destination_1 = require("../security/destination");
const audit_event_1 = require("./audit-event");
const scheduler_policy_1 = require("./scheduler-policy");
const logger_1 = require("../utils/logger");
const automation_execution_service_1 = require("./automation-execution.service");
const message_operation_service_1 = require("./message-operation.service");
const poll_service_1 = require("./poll.service");
const RETRY_MESSAGE = 'Delivery failed after the configured retry policy.';
async function recordDeliveryAudit(input) {
    try {
        await client_1.prisma.auditLog.create({
            data: {
                guildId: input.guildId,
                executorId: input.actorId,
                targetId: input.targetId,
                action: input.action,
                details: (0, audit_event_1.createAuditDetails)({
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
    }
    catch (error) {
        logger_1.logger.error({ guildId: input.guildId, action: input.action, outcome: input.outcome, errorType: (0, scheduler_policy_1.safeDeliveryError)(error) }, 'Scheduled delivery audit write failed');
    }
}
class SchedulerService {
    static isRunning = false;
    static busy = false;
    static lastTick = 0;
    static failed = false;
    static health() {
        return !this.isRunning ? 'OFFLINE' : !this.lastTick ? 'UNKNOWN' : this.failed || Date.now() - this.lastTick > 150000 ? 'DEGRADED' : 'OPERATIONAL';
    }
    static start(client) {
        if (this.isRunning)
            return;
        this.isRunning = true;
        logger_1.logger.info('⏰ Durable scheduled delivery worker initialized');
        node_cron_1.default.schedule('* * * * *', async () => {
            if (this.busy)
                return;
            this.busy = true;
            this.failed = false;
            const now = new Date();
            try {
                await this.processReminders(client, now);
                await this.processAnnouncements(client, now);
                await automation_execution_service_1.AutomationExecutionService.processDue(client, now);
                await poll_service_1.PollService.expireDue(now);
                await this.syncClosedPollMessages(client);
            }
            catch (error) {
                this.failed = true;
                logger_1.logger.error({ errorType: (0, scheduler_policy_1.safeDeliveryError)(error) }, 'Scheduled delivery scan failed');
            }
            finally {
                this.busy = false;
                this.lastTick = Date.now();
            }
        });
    }
    static async syncClosedPollMessages(client) {
        const polls = await client_1.prisma.poll.findMany({ where: { status: 'CLOSED', messageSyncStatus: 'NEEDS_UPDATE', messageId: { not: null } }, take: 100 });
        for (const poll of polls) {
            try {
                const options = (0, poll_service_1.parsePollOptions)(poll.options);
                const counts = await poll_service_1.PollService.counts(poll.guildId, poll.id, options.length);
                let target;
                let message;
                const adapter = {
                    async authorize(input) {
                        target = await (0, destination_1.workerDestination)(client, input.guildId, input.channelId);
                        message = await target.messages.fetch(input.targetMessageId);
                        if (message.channelId !== input.channelId || message.guildId !== input.guildId || message.author.id !== client.user?.id)
                            throw new Error('PollMessageOwnershipMismatch');
                    },
                    async send() { throw new Error('Poll message update cannot send'); },
                    async edit(args) {
                        if (!target || !message)
                            throw new Error('Poll message was not authorized');
                        const updated = await message.edit({ content: args.content, embeds: args.embeds, components: args.components,
                            allowedMentions: args.allowedMentions });
                        return { messageId: updated.id };
                    },
                    async delete() { throw new Error('Poll message update cannot delete'); },
                };
                const result = await message_operation_service_1.MessageOperationService.execute({ guildId: poll.guildId, actorId: poll.closedBy || poll.createdBy,
                    source: 'BOT', operationType: 'EDIT', idempotencyKey: `poll_close_${poll.id}`, channelId: poll.channelId,
                    targetMessageId: poll.messageId, embeds: [(0, poll_service_1.pollEmbed)(poll.question, options, counts, true)],
                    components: (0, poll_service_1.pollComponents)(poll.id, options, true), mentionMode: 'NONE' }, adapter);
                if (result.status === 'SUCCESS')
                    await poll_service_1.PollService.markMessageSynced(poll.guildId, poll.id);
                else
                    this.failed = true;
            }
            catch (error) {
                this.failed = true;
                logger_1.logger.warn({ guildId: poll.guildId, pollId: poll.id, errorType: (0, scheduler_policy_1.safeDeliveryError)(error) }, 'Closed poll message synchronization is pending');
            }
        }
    }
    static async processReminders(client, now) {
        const due = await scheduler_repository_1.SchedulerRepository.findDueReminders(now);
        for (const reminder of due) {
            if (reminder.status === 'PROCESSING' && reminder.attempts >= reminder.maxAttempts) {
                const expired = await scheduler_repository_1.SchedulerRepository.failExpiredReminder(reminder, now);
                if (expired.count) {
                    this.failed = true;
                    await recordDeliveryAudit({ guildId: reminder.guildId, actorId: reminder.createdBy, targetId: reminder.id,
                        action: 'REMINDER_DELIVERY', outcome: 'FAILURE', attempt: reminder.attempts, maxAttempts: reminder.maxAttempts, errorType: 'LeaseExpired' });
                }
                continue;
            }
            const leaseToken = (0, node_crypto_1.randomUUID)();
            const leaseExpiresAt = new Date(now.getTime() + scheduler_policy_1.SCHEDULER_LEASE_MS);
            const claimed = await scheduler_repository_1.SchedulerRepository.claimReminder(reminder, now, leaseToken, leaseExpiresAt);
            if (!claimed.count)
                continue;
            const attempt = reminder.attempts + 1;
            try {
                let sentMessageId;
                const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader(`REMINDER: ${reminder.title}`, 'SCHEDULED ALERT');
                embed.setDescription(reminder.message);
                const messageOptions = {
                    embeds: [embed],
                    allowedMentions: { parse: [] },
                    nonce: reminder.idempotencyKey.slice(0, 25),
                    enforceNonce: true,
                };
                if (reminder.targetType === 'USER') {
                    if (reminder.targetId !== reminder.createdBy)
                        throw new Error('ReminderRecipientMismatch');
                    const guild = await client.guilds.fetch(reminder.guildId);
                    const user = (await guild.members.fetch(reminder.targetId)).user;
                    const sent = await user.send(messageOptions);
                    sentMessageId = sent.id;
                }
                else if (reminder.targetType === 'CHANNEL') {
                    const channel = await (0, destination_1.workerDestination)(client, reminder.guildId, reminder.targetId);
                    const sent = await channel.send(messageOptions);
                    sentMessageId = sent.id;
                }
                else {
                    throw new Error('UnknownReminderDestination');
                }
                const completed = await scheduler_repository_1.SchedulerRepository.completeReminder(reminder.id, reminder.guildId, leaseToken);
                if (!completed.count) {
                    logger_1.logger.warn({ guildId: reminder.guildId, reminderId: reminder.id, messageId: sentMessageId }, 'Reminder delivered after its lease was no longer owned');
                    continue;
                }
                await recordDeliveryAudit({ guildId: reminder.guildId, actorId: reminder.createdBy, targetId: reminder.id,
                    action: 'REMINDER_DELIVERY', outcome: 'SUCCESS', attempt, maxAttempts: reminder.maxAttempts });
                logger_1.logger.info({ guildId: reminder.guildId, reminderId: reminder.id, messageId: sentMessageId, attempt }, 'Dispatched scheduled reminder');
            }
            catch (error) {
                const errorType = (0, scheduler_policy_1.safeDeliveryError)(error);
                const decision = (0, scheduler_policy_1.retryDecision)(attempt, reminder.maxAttempts, 'ACTIVE', new Date(), (0, scheduler_policy_1.deliveryFailurePolicy)(error));
                const updated = await scheduler_repository_1.SchedulerRepository.failReminder(reminder.id, reminder.guildId, leaseToken, decision, errorType);
                if (updated.count) {
                    this.failed = true;
                    await recordDeliveryAudit({ guildId: reminder.guildId, actorId: reminder.createdBy, targetId: reminder.id,
                        action: 'REMINDER_DELIVERY', outcome: 'FAILURE', attempt, maxAttempts: reminder.maxAttempts, errorType });
                    logger_1.logger.warn({ guildId: reminder.guildId, reminderId: reminder.id, attempt, maxAttempts: reminder.maxAttempts, nextAttemptAt: decision.nextAttemptAt, errorType }, 'Reminder delivery attempt failed');
                }
                else {
                    logger_1.logger.warn({ guildId: reminder.guildId, reminderId: reminder.id }, 'Reminder delivery failed after its lease was no longer owned');
                }
            }
        }
    }
    static async processAnnouncements(client, now) {
        const due = await scheduler_repository_1.SchedulerRepository.findDueAnnouncements(now);
        for (const announcement of due) {
            if (announcement.status === 'PROCESSING' && announcement.attempts >= announcement.maxAttempts) {
                const expired = await scheduler_repository_1.SchedulerRepository.failExpiredAnnouncement(announcement, now);
                if (expired.count) {
                    this.failed = true;
                    await recordDeliveryAudit({ guildId: announcement.guildId, actorId: announcement.createdBy, targetId: announcement.id,
                        action: 'ANNOUNCEMENT_DELIVERY', outcome: 'FAILURE', attempt: announcement.attempts, maxAttempts: announcement.maxAttempts, errorType: 'LeaseExpired' });
                }
                continue;
            }
            const leaseToken = (0, node_crypto_1.randomUUID)();
            const leaseExpiresAt = new Date(now.getTime() + scheduler_policy_1.SCHEDULER_LEASE_MS);
            const claimed = await scheduler_repository_1.SchedulerRepository.claimAnnouncement(announcement, now, leaseToken, leaseExpiresAt);
            if (!claimed.count)
                continue;
            const attempt = announcement.attempts + 1;
            try {
                const channel = await (0, destination_1.workerDestination)(client, announcement.guildId, announcement.channelId);
                let content = announcement.content || undefined;
                if (announcement.mentionType === 'EVERYONE')
                    content = content ? `@everyone\n${content}` : '@everyone';
                else if (announcement.mentionType === 'HERE')
                    content = content ? `@here\n${content}` : '@here';
                else if (announcement.mentionType === 'ROLE' && announcement.mentionRoleId) {
                    const mention = `<@&${announcement.mentionRoleId}>`;
                    content = content ? `${mention}\n${content}` : mention;
                }
                let embeds = [];
                if (announcement.embedPayload) {
                    const parsed = JSON.parse(announcement.embedPayload);
                    if (!Array.isArray(parsed))
                        throw new Error('InvalidAnnouncementEmbeds');
                    embeds = parsed;
                }
                const allowedMentions = announcement.mentionType === 'ROLE' && announcement.mentionRoleId
                    ? { parse: [], roles: [announcement.mentionRoleId] }
                    : announcement.mentionType === 'EVERYONE' || announcement.mentionType === 'HERE'
                        ? { parse: ['everyone'] }
                        : { parse: [] };
                const sentMessage = await channel.send({
                    content,
                    embeds,
                    allowedMentions,
                    nonce: announcement.idempotencyKey.slice(0, 25),
                    enforceNonce: true,
                });
                const sentAt = new Date();
                const completed = await scheduler_repository_1.SchedulerRepository.completeAnnouncement(announcement.id, announcement.guildId, leaseToken, sentMessage.id, sentAt, {
                    title: announcement.title || 'Scheduled Announcement',
                    content: announcement.content || 'Announcement',
                    department: announcement.department,
                    type: announcement.announcementType,
                    authorId: announcement.createdBy,
                    channelId: announcement.channelId,
                    mentionRole: announcement.mentionRoleId,
                });
                if (!completed.count) {
                    logger_1.logger.warn({ guildId: announcement.guildId, announcementId: announcement.id, messageId: sentMessage.id }, 'Announcement delivered after its lease was no longer owned');
                    continue;
                }
                await recordDeliveryAudit({ guildId: announcement.guildId, actorId: announcement.createdBy, targetId: announcement.id,
                    action: 'ANNOUNCEMENT_DELIVERY', outcome: 'SUCCESS', attempt, maxAttempts: announcement.maxAttempts });
                logger_1.logger.info({ guildId: announcement.guildId, announcementId: announcement.id, channelId: announcement.channelId, attempt }, 'Dispatched scheduled announcement');
            }
            catch (error) {
                const errorType = (0, scheduler_policy_1.safeDeliveryError)(error);
                const decision = (0, scheduler_policy_1.retryDecision)(attempt, announcement.maxAttempts, 'PENDING', new Date(), (0, scheduler_policy_1.deliveryFailurePolicy)(error));
                const updated = await scheduler_repository_1.SchedulerRepository.failAnnouncement(announcement.id, announcement.guildId, leaseToken, decision, errorType, RETRY_MESSAGE);
                if (updated.count) {
                    this.failed = true;
                    await recordDeliveryAudit({ guildId: announcement.guildId, actorId: announcement.createdBy, targetId: announcement.id,
                        action: 'ANNOUNCEMENT_DELIVERY', outcome: 'FAILURE', attempt, maxAttempts: announcement.maxAttempts, errorType });
                    logger_1.logger.warn({ guildId: announcement.guildId, announcementId: announcement.id, attempt, maxAttempts: announcement.maxAttempts, nextAttemptAt: decision.nextAttemptAt, errorType }, 'Scheduled announcement delivery attempt failed');
                }
                else {
                    logger_1.logger.warn({ guildId: announcement.guildId, announcementId: announcement.id }, 'Announcement delivery failed after its lease was no longer owned');
                }
            }
        }
    }
}
exports.SchedulerService = SchedulerService;
