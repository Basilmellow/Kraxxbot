import { randomUUID } from 'node:crypto';
import type { Client } from 'discord.js';
import type { AutomationExecution } from '@prisma/client';
import { AutomationExecutionRepository } from '../database/repositories/automation-execution.repository';
import { workerDestination } from '../security/destination';
import { deliveryFailurePolicy, retryDecision, safeDeliveryError, SCHEDULER_LEASE_MS } from './scheduler-policy';
import { validateAutomationConfig } from './automation-contract';
import { logger } from '../utils/logger';
import { prisma } from '../database/client';
import { createAuditDetails } from './audit-event';
import { createWelcomeDeliveryAdapter, renderWelcomeText } from './welcome-delivery.service';
import { GuildRepository } from '../database/repositories/guild.repository';

type MemberEventData = { guildId: string; userId: string; username: string; displayName: string; serverName: string; memberCount: number };

function permanentFailure(name: string): Error & { status: number } {
  return Object.assign(new Error(name), { name, status: 400 });
}

function parseEventData(raw: string, guildId: string): MemberEventData {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw permanentFailure('InvalidAutomationEvent'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw permanentFailure('InvalidAutomationEvent');
  const event = value as Record<string, unknown>;
  if (event.guildId !== guildId || typeof event.userId !== 'string' || !/^\d{17,20}$/.test(event.userId)
    || typeof event.username !== 'string' || typeof event.displayName !== 'string' || typeof event.serverName !== 'string'
    || typeof event.memberCount !== 'number' || !Number.isFinite(event.memberCount)) {
    throw permanentFailure('InvalidAutomationEvent');
  }
  return event as MemberEventData;
}

function renderMessage(template: string, event: MemberEventData): string {
  const message = template
    .replace(/\{user\}/g, event.displayName)
    .replace(/\{server\}/g, event.serverName)
    .replace(/\{memberCount\}/g, String(event.memberCount));
  if (!message.trim() || message.length > 2000) throw permanentFailure('InvalidAutomationMessage');
  return message;
}

function parseWelcomeJobConfig(raw: string, action: string): { channelId?: string; message: string; imageUrl?: string } {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw permanentFailure('InvalidWelcomeDeliveryConfig'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw permanentFailure('InvalidWelcomeDeliveryConfig');
  const config = value as Record<string, unknown>;
  const needsChannel = action === 'WELCOME_CHANNEL' || action === 'GOODBYE_CHANNEL';
  if (Object.keys(config).some((key) => !['channelId', 'message', 'imageUrl'].includes(key))
    || typeof config.message !== 'string' || !config.message.trim() || config.message.length > 2000
    || (needsChannel && (typeof config.channelId !== 'string' || !/^\d{17,20}$/.test(config.channelId)))
    || (!needsChannel && config.channelId !== undefined)
    || (config.imageUrl !== undefined && (typeof config.imageUrl !== 'string' || !/^https:\/\//.test(config.imageUrl)))) {
    throw permanentFailure('InvalidWelcomeDeliveryConfig');
  }
  return config as { channelId?: string; message: string; imageUrl?: string };
}

async function deliverWelcomeExecution(item: AutomationExecution, event: MemberEventData): Promise<void> {
  if (!(await GuildRepository.isModuleEnabled(item.guildId, 'welcome'))) throw permanentFailure('WelcomeModuleDisabled');
  const config = parseWelcomeJobConfig(item.config, item.action);
  const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN || '';
  const adapter = createWelcomeDeliveryAdapter(token);
  const payload = {
    content: renderWelcomeText(config.message, { guildId: event.guildId, guildName: event.serverName, memberCount: event.memberCount,
      userId: event.userId, username: event.username, userTag: event.username }),
    ...(item.action === 'WELCOME_CHANNEL' && config.imageUrl ? { embeds: [{ image: { url: config.imageUrl } }] } : {}),
    allowed_mentions: { parse: [] as string[], users: [event.userId] },
    nonce: item.idempotencyKey.slice(0, 25),
    enforce_nonce: true,
  };
  if (item.action === 'WELCOME_CHANNEL' || item.action === 'GOODBYE_CHANNEL')
    await adapter.sendGuildMessage(item.guildId, config.channelId!, payload);
  else if (item.action === 'WELCOME_DM') await adapter.sendDirectMessage(event.userId, payload);
  else throw permanentFailure('UnsupportedWelcomeDeliveryAction');
}

async function recordExecutionAudit(input: { guildId: string; executionId: string; eventType: string; outcome: 'SUCCESS' | 'FAILURE'; attempt: number; errorType?: string; action?: string; targetId?: string }) {
  try {
    await prisma.auditLog.create({
      data: {
        guildId: input.guildId,
        executorId: 'SYSTEM',
        targetId: input.targetId || input.executionId,
        action: input.action || 'AUTOMATION_EXECUTION',
        details: createAuditDetails({
          source: 'BOT',
          targetType: input.action === 'WELCOME_DELIVERY' ? 'MEMBER' : 'AUTOMATION_EXECUTION',
          outcome: input.outcome,
          metadata: { eventType: input.eventType, attempt: input.attempt, ...(input.errorType ? { errorType: input.errorType } : {}) },
        }),
      },
    });
  } catch (error) {
    logger.error({ guildId: input.guildId, executionId: input.executionId, errorType: safeDeliveryError(error) }, 'Automation execution audit write failed');
  }
}

export class AutomationExecutionService {
  static enqueueMemberEvent(input: MemberEventData & { eventType: 'MEMBER_JOIN' | 'MEMBER_LEAVE'; eventId: string }) {
    return AutomationExecutionRepository.enqueueEvent(input.guildId, input.eventType, input.eventId, input);
  }

  static enqueueWelcomeMemberEvent(input: MemberEventData & {
    eventType: 'MEMBER_JOIN' | 'MEMBER_LEAVE'; eventId: string;
    config: { enabled: boolean; channelId: string | null; message: string | null; imageUrl: string | null; dmEnabled: boolean; dmMessage: string | null; leaveChannelId: string | null; leaveMessage: string | null };
  }) {
    const deliveries: Array<{ action: 'WELCOME_CHANNEL' | 'WELCOME_DM' | 'GOODBYE_CHANNEL'; config: unknown }> = [];
    if (input.config.enabled && input.eventType === 'MEMBER_JOIN') {
      if (input.config.channelId) deliveries.push({ action: 'WELCOME_CHANNEL', config: {
        channelId: input.config.channelId,
        message: input.config.message || 'Welcome {user} to **{server}**! We are now {memberCount} members.',
        ...(input.config.imageUrl ? { imageUrl: input.config.imageUrl } : {}),
      } });
      if (input.config.dmEnabled) deliveries.push({ action: 'WELCOME_DM', config: {
        message: input.config.dmMessage || 'Welcome to {server}! Please review {rules} to get started.',
      } });
    }
    if (input.config.enabled && input.eventType === 'MEMBER_LEAVE' && input.config.leaveChannelId)
      deliveries.push({ action: 'GOODBYE_CHANNEL', config: {
        channelId: input.config.leaveChannelId,
        message: input.config.leaveMessage || '{username} has departed from {server}.',
      } });
    return AutomationExecutionRepository.enqueueWelcomeDeliveries({
      guildId: input.guildId, eventType: input.eventType, eventId: input.eventId, eventData: input, deliveries,
    });
  }

  static async processDue(client: Client, now = new Date()): Promise<void> {
    const due = await AutomationExecutionRepository.findDue(now);
    for (const item of due) {
      const isAutomation = item.ruleId !== null;
      const isWelcome = item.action === 'WELCOME_CHANNEL' || item.action === 'WELCOME_DM' || item.action === 'GOODBYE_CHANNEL';
      if (isAutomation && (await GuildRepository.getModuleOperationalState(item.guildId, 'automation')) !== 'ENABLED') continue;

      if (item.status === 'PROCESSING' && item.attempts >= item.maxAttempts) {
        const failed = await AutomationExecutionRepository.failExpired(item, now);
        if (failed.count) {
          await recordExecutionAudit({ guildId: item.guildId, executionId: item.id, eventType: item.eventType,
            outcome: 'FAILURE', attempt: item.attempts, errorType: 'LeaseExpired' });
        }
        continue;
      }

      const leaseToken = randomUUID();
      const claimed = await AutomationExecutionRepository.claim(
        item,
        now,
        leaseToken,
        new Date(now.getTime() + SCHEDULER_LEASE_MS),
      );
      if (!claimed.count) continue;
      const attempt = item.attempts + 1;

      try {
        // Recheck after claiming to avoid spending a retry if the module was disabled
        // between discovery and lease acquisition. Welcome jobs remain independently gated.
        if (isAutomation && (await GuildRepository.getModuleOperationalState(item.guildId, 'automation')) !== 'ENABLED') {
          await AutomationExecutionRepository.releaseForDisabledModule(item.id, item.guildId, leaseToken);
          continue;
        }
        const event = parseEventData(item.eventData, item.guildId);
        if (isWelcome) await deliverWelcomeExecution(item, event);
        else {
          const config = validateAutomationConfig(item.eventType, item.action, item.config);
          const content = renderMessage(config.message, event);
          const messageOptions = {
            content,
            allowedMentions: { parse: [] as never[] },
            nonce: item.idempotencyKey.slice(0, 25),
            enforceNonce: true,
          };
          if (item.action === 'SEND_MESSAGE') {
            const channel = await workerDestination(client, item.guildId, config.channelId!);
            await channel.send(messageOptions);
          } else if (item.action === 'SEND_DM') {
            const guild = await client.guilds.fetch(item.guildId);
            if (item.eventType === 'MEMBER_JOIN') await guild.members.fetch(event.userId);
            const user = await client.users.fetch(event.userId);
            await user.send(messageOptions);
          } else throw permanentFailure('UnsupportedAutomationAction');
        }

        const completed = await AutomationExecutionRepository.complete(item.id, item.guildId, leaseToken);
        if (!completed.count) {
          logger.warn({ guildId: item.guildId, executionId: item.id }, 'Automation action delivered after lease ownership changed');
        } else {
          await recordExecutionAudit({ guildId: item.guildId, executionId: item.id, eventType: item.eventType, outcome: 'SUCCESS', attempt,
            ...(isWelcome ? { action: 'WELCOME_DELIVERY', targetId: event.userId } : {}) });
        }
      } catch (error) {
        const errorType = safeDeliveryError(error);
        const decision = retryDecision(attempt, item.maxAttempts, 'PENDING', new Date(), deliveryFailurePolicy(error));
        const updated = await AutomationExecutionRepository.fail(item.id, item.guildId, leaseToken, decision, errorType);
        if (updated.count) {
          const isWelcome = item.action === 'WELCOME_CHANNEL' || item.action === 'WELCOME_DM' || item.action === 'GOODBYE_CHANNEL';
          let failedTargetId: string | undefined;
          if (isWelcome) {
            try { failedTargetId = parseEventData(item.eventData, item.guildId).userId; } catch { /* malformed event is audited against the execution */ }
          }
          await recordExecutionAudit({ guildId: item.guildId, executionId: item.id, eventType: item.eventType, outcome: 'FAILURE', attempt, errorType,
            ...(isWelcome ? { action: 'WELCOME_DELIVERY', ...(failedTargetId ? { targetId: failedTargetId } : {}) } : {}) });
          logger.warn({ guildId: item.guildId, executionId: item.id, attempt, errorType }, 'Automation execution failed');
        }
      }
    }
  }
}
