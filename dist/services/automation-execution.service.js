"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationExecutionService = void 0;
const node_crypto_1 = require("node:crypto");
const automation_execution_repository_1 = require("../database/repositories/automation-execution.repository");
const destination_1 = require("../security/destination");
const scheduler_policy_1 = require("./scheduler-policy");
const automation_contract_1 = require("./automation-contract");
const logger_1 = require("../utils/logger");
const client_1 = require("../database/client");
const audit_event_1 = require("./audit-event");
const welcome_delivery_service_1 = require("./welcome-delivery.service");
const guild_repository_1 = require("../database/repositories/guild.repository");
function permanentFailure(name) {
    return Object.assign(new Error(name), { name, status: 400 });
}
function parseEventData(raw, guildId) {
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        throw permanentFailure('InvalidAutomationEvent');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw permanentFailure('InvalidAutomationEvent');
    const event = value;
    if (event.guildId !== guildId || typeof event.userId !== 'string' || !/^\d{17,20}$/.test(event.userId)
        || typeof event.username !== 'string' || typeof event.displayName !== 'string' || typeof event.serverName !== 'string'
        || typeof event.memberCount !== 'number' || !Number.isFinite(event.memberCount)) {
        throw permanentFailure('InvalidAutomationEvent');
    }
    return event;
}
function renderMessage(template, event) {
    const message = template
        .replace(/\{user\}/g, event.displayName)
        .replace(/\{server\}/g, event.serverName)
        .replace(/\{memberCount\}/g, String(event.memberCount));
    if (!message.trim() || message.length > 2000)
        throw permanentFailure('InvalidAutomationMessage');
    return message;
}
function parseWelcomeJobConfig(raw, action) {
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        throw permanentFailure('InvalidWelcomeDeliveryConfig');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw permanentFailure('InvalidWelcomeDeliveryConfig');
    const config = value;
    const needsChannel = action === 'WELCOME_CHANNEL' || action === 'GOODBYE_CHANNEL';
    if (Object.keys(config).some((key) => !['channelId', 'message', 'imageUrl'].includes(key))
        || typeof config.message !== 'string' || !config.message.trim() || config.message.length > 2000
        || (needsChannel && (typeof config.channelId !== 'string' || !/^\d{17,20}$/.test(config.channelId)))
        || (!needsChannel && config.channelId !== undefined)
        || (config.imageUrl !== undefined && (typeof config.imageUrl !== 'string' || !/^https:\/\//.test(config.imageUrl)))) {
        throw permanentFailure('InvalidWelcomeDeliveryConfig');
    }
    return config;
}
async function deliverWelcomeExecution(item, event) {
    if (!(await guild_repository_1.GuildRepository.isModuleEnabled(item.guildId, 'welcome')))
        throw permanentFailure('WelcomeModuleDisabled');
    const config = parseWelcomeJobConfig(item.config, item.action);
    const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || '';
    const adapter = (0, welcome_delivery_service_1.createWelcomeDeliveryAdapter)(token);
    const payload = {
        content: (0, welcome_delivery_service_1.renderWelcomeText)(config.message, { guildId: event.guildId, guildName: event.serverName, memberCount: event.memberCount,
            userId: event.userId, username: event.username, userTag: event.username }),
        ...(item.action === 'WELCOME_CHANNEL' && config.imageUrl ? { embeds: [{ image: { url: config.imageUrl } }] } : {}),
        allowed_mentions: { parse: [], users: [event.userId] },
        nonce: item.idempotencyKey.slice(0, 25),
        enforce_nonce: true,
    };
    if (item.action === 'WELCOME_CHANNEL' || item.action === 'GOODBYE_CHANNEL')
        await adapter.sendGuildMessage(item.guildId, config.channelId, payload);
    else if (item.action === 'WELCOME_DM')
        await adapter.sendDirectMessage(event.userId, payload);
    else
        throw permanentFailure('UnsupportedWelcomeDeliveryAction');
}
async function recordExecutionAudit(input) {
    try {
        await client_1.prisma.auditLog.create({
            data: {
                guildId: input.guildId,
                executorId: 'SYSTEM',
                targetId: input.targetId || input.executionId,
                action: input.action || 'AUTOMATION_EXECUTION',
                details: (0, audit_event_1.createAuditDetails)({
                    source: 'BOT',
                    targetType: input.action === 'WELCOME_DELIVERY' ? 'MEMBER' : 'AUTOMATION_EXECUTION',
                    outcome: input.outcome,
                    metadata: { eventType: input.eventType, attempt: input.attempt, ...(input.errorType ? { errorType: input.errorType } : {}) },
                }),
            },
        });
    }
    catch (error) {
        logger_1.logger.error({ guildId: input.guildId, executionId: input.executionId, errorType: (0, scheduler_policy_1.safeDeliveryError)(error) }, 'Automation execution audit write failed');
    }
}
class AutomationExecutionService {
    static enqueueMemberEvent(input) {
        return automation_execution_repository_1.AutomationExecutionRepository.enqueueEvent(input.guildId, input.eventType, input.eventId, input);
    }
    static enqueueWelcomeMemberEvent(input) {
        const deliveries = [];
        if (input.config.enabled && input.eventType === 'MEMBER_JOIN') {
            if (input.config.channelId)
                deliveries.push({ action: 'WELCOME_CHANNEL', config: {
                        channelId: input.config.channelId,
                        message: input.config.message || 'Welcome {user} to **{server}**! We are now {memberCount} members.',
                        ...(input.config.imageUrl ? { imageUrl: input.config.imageUrl } : {}),
                    } });
            if (input.config.dmEnabled)
                deliveries.push({ action: 'WELCOME_DM', config: {
                        message: input.config.dmMessage || 'Welcome to {server}! Please review {rules} to get started.',
                    } });
        }
        if (input.config.enabled && input.eventType === 'MEMBER_LEAVE' && input.config.leaveChannelId)
            deliveries.push({ action: 'GOODBYE_CHANNEL', config: {
                    channelId: input.config.leaveChannelId,
                    message: input.config.leaveMessage || '{username} has departed from {server}.',
                } });
        return automation_execution_repository_1.AutomationExecutionRepository.enqueueWelcomeDeliveries({
            guildId: input.guildId, eventType: input.eventType, eventId: input.eventId, eventData: input, deliveries,
        });
    }
    static async processDue(client, now = new Date()) {
        const due = await automation_execution_repository_1.AutomationExecutionRepository.findDue(now);
        for (const item of due) {
            const isAutomation = item.ruleId !== null;
            const isWelcome = item.action === 'WELCOME_CHANNEL' || item.action === 'WELCOME_DM' || item.action === 'GOODBYE_CHANNEL';
            if (isAutomation && (await guild_repository_1.GuildRepository.getModuleOperationalState(item.guildId, 'automation')) !== 'ENABLED')
                continue;
            if (item.status === 'PROCESSING' && item.attempts >= item.maxAttempts) {
                const failed = await automation_execution_repository_1.AutomationExecutionRepository.failExpired(item, now);
                if (failed.count) {
                    await recordExecutionAudit({ guildId: item.guildId, executionId: item.id, eventType: item.eventType,
                        outcome: 'FAILURE', attempt: item.attempts, errorType: 'LeaseExpired' });
                }
                continue;
            }
            const leaseToken = (0, node_crypto_1.randomUUID)();
            const claimed = await automation_execution_repository_1.AutomationExecutionRepository.claim(item, now, leaseToken, new Date(now.getTime() + scheduler_policy_1.SCHEDULER_LEASE_MS));
            if (!claimed.count)
                continue;
            const attempt = item.attempts + 1;
            try {
                // Recheck after claiming to avoid spending a retry if the module was disabled
                // between discovery and lease acquisition. Welcome jobs remain independently gated.
                if (isAutomation && (await guild_repository_1.GuildRepository.getModuleOperationalState(item.guildId, 'automation')) !== 'ENABLED') {
                    await automation_execution_repository_1.AutomationExecutionRepository.releaseForDisabledModule(item.id, item.guildId, leaseToken);
                    continue;
                }
                const event = parseEventData(item.eventData, item.guildId);
                if (isWelcome)
                    await deliverWelcomeExecution(item, event);
                else {
                    const config = (0, automation_contract_1.validateAutomationConfig)(item.eventType, item.action, item.config);
                    const content = renderMessage(config.message, event);
                    const messageOptions = {
                        content,
                        allowedMentions: { parse: [] },
                        nonce: item.idempotencyKey.slice(0, 25),
                        enforceNonce: true,
                    };
                    if (item.action === 'SEND_MESSAGE') {
                        const channel = await (0, destination_1.workerDestination)(client, item.guildId, config.channelId);
                        await channel.send(messageOptions);
                    }
                    else if (item.action === 'SEND_DM') {
                        const guild = await client.guilds.fetch(item.guildId);
                        if (item.eventType === 'MEMBER_JOIN')
                            await guild.members.fetch(event.userId);
                        const user = await client.users.fetch(event.userId);
                        await user.send(messageOptions);
                    }
                    else
                        throw permanentFailure('UnsupportedAutomationAction');
                }
                const completed = await automation_execution_repository_1.AutomationExecutionRepository.complete(item.id, item.guildId, leaseToken);
                if (!completed.count) {
                    logger_1.logger.warn({ guildId: item.guildId, executionId: item.id }, 'Automation action delivered after lease ownership changed');
                }
                else {
                    await recordExecutionAudit({ guildId: item.guildId, executionId: item.id, eventType: item.eventType, outcome: 'SUCCESS', attempt,
                        ...(isWelcome ? { action: 'WELCOME_DELIVERY', targetId: event.userId } : {}) });
                }
            }
            catch (error) {
                const errorType = (0, scheduler_policy_1.safeDeliveryError)(error);
                const decision = (0, scheduler_policy_1.retryDecision)(attempt, item.maxAttempts, 'PENDING', new Date(), (0, scheduler_policy_1.deliveryFailurePolicy)(error));
                const updated = await automation_execution_repository_1.AutomationExecutionRepository.fail(item.id, item.guildId, leaseToken, decision, errorType);
                if (updated.count) {
                    const isWelcome = item.action === 'WELCOME_CHANNEL' || item.action === 'WELCOME_DM' || item.action === 'GOODBYE_CHANNEL';
                    let failedTargetId;
                    if (isWelcome) {
                        try {
                            failedTargetId = parseEventData(item.eventData, item.guildId).userId;
                        }
                        catch { /* malformed event is audited against the execution */ }
                    }
                    await recordExecutionAudit({ guildId: item.guildId, executionId: item.id, eventType: item.eventType, outcome: 'FAILURE', attempt, errorType,
                        ...(isWelcome ? { action: 'WELCOME_DELIVERY', ...(failedTargetId ? { targetId: failedTargetId } : {}) } : {}) });
                    logger_1.logger.warn({ guildId: item.guildId, executionId: item.id, attempt, errorType }, 'Automation execution failed');
                }
            }
        }
    }
}
exports.AutomationExecutionService = AutomationExecutionService;
