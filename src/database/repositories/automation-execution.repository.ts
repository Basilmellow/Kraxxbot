import { createHash } from 'node:crypto';
import { prisma } from '../client';
import type { AutomationExecution } from '@prisma/client';
import { GuildRepository } from './guild.repository';

const EVENT_READY = (now: Date) => ({
  OR: [
    { status: 'PENDING', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
    { status: 'PROCESSING', leaseExpiresAt: { lte: now } },
  ],
});

export class AutomationExecutionRepository {
  static async enqueueEvent(guildId: string, eventType: string, eventId: string, eventData: unknown) {
    const moduleState = await GuildRepository.getModuleOperationalState(guildId, 'automation');
    if (moduleState !== 'ENABLED') {
      return { count: 0, moduleState };
    }

    const rules = await prisma.automationRule.findMany({
      where: { guildId, trigger: eventType, enabled: true },
      select: { id: true, guildId: true, action: true, config: true },
    });
    if (rules.length === 0) return { count: 0 };

    const serializedEvent = JSON.stringify(eventData);
    if (serializedEvent.length > 16_384) throw new Error('AutomationEventTooLarge');
    return prisma.automationExecution.createMany({
      data: rules.map((rule) => ({
        ruleId: rule.id,
        guildId: rule.guildId,
        eventType,
        eventId,
        eventData: serializedEvent,
        action: rule.action,
        config: rule.config,
        idempotencyKey: createHash('sha256').update(`${rule.id}:${eventType}:${eventId}`).digest('hex'),
      })),
      skipDuplicates: true,
    });
  }

  static async enqueueWelcomeDeliveries(input: {
    guildId: string;
    eventType: 'MEMBER_JOIN' | 'MEMBER_LEAVE';
    eventId: string;
    eventData: unknown;
    deliveries: Array<{ action: 'WELCOME_CHANNEL' | 'WELCOME_DM' | 'GOODBYE_CHANNEL'; config: unknown }>;
  }) {
    if (!/^\d{17,20}$/.test(input.guildId) || !input.eventId || input.eventId.length > 120)
      throw new Error('Invalid welcome delivery event identity.');
    if (!input.deliveries.length) return { count: 0 };
    const serializedEvent = JSON.stringify(input.eventData);
    if (serializedEvent.length > 16_384) throw new Error('WelcomeEventTooLarge');
    return prisma.automationExecution.createMany({
      data: input.deliveries.map(({ action, config }) => {
        const serializedConfig = JSON.stringify(config);
        if (serializedConfig.length > 8192) throw new Error('WelcomeConfigTooLarge');
        const eventId = `${input.eventId}:${action}`;
        return {
          ruleId: null,
          guildId: input.guildId,
          eventType: input.eventType,
          eventId,
          eventData: serializedEvent,
          action,
          config: serializedConfig,
          idempotencyKey: createHash('sha256').update(`welcome:${input.guildId}:${input.eventType}:${eventId}`).digest('hex'),
        };
      }),
      skipDuplicates: true,
    });
  }

  static findDue(now: Date): Promise<AutomationExecution[]> {
    return prisma.automationExecution.findMany({
      where: { ...EVENT_READY(now) },
      orderBy: [{ createdAt: 'asc' }],
      take: 100,
    });
  }

  static claim(item: AutomationExecution, now: Date, leaseToken: string, leaseExpiresAt: Date) {
    return prisma.automationExecution.updateMany({
      where: {
        id: item.id,
        guildId: item.guildId,
        OR: [
          { status: 'PENDING', attempts: { lt: item.maxAttempts }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
          { status: 'PROCESSING', leaseExpiresAt: { lte: now }, attempts: { lt: item.maxAttempts } },
        ],
      },
      data: { status: 'PROCESSING', leaseToken, leaseExpiresAt, attempts: { increment: 1 } },
    });
  }

  static complete(id: string, guildId: string, leaseToken: string) {
    return prisma.automationExecution.updateMany({
      where: { id, guildId, status: 'PROCESSING', leaseToken },
      data: { status: 'COMPLETED', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: null },
    });
  }

  static fail(id: string, guildId: string, leaseToken: string, decision: { status: string; nextAttemptAt: Date | null }, lastError: string) {
    return prisma.automationExecution.updateMany({
      where: { id, guildId, status: 'PROCESSING', leaseToken },
      data: { ...decision, leaseToken: null, leaseExpiresAt: null, lastError },
    });
  }

  static releaseForDisabledModule(id: string, guildId: string, leaseToken: string) {
    return prisma.automationExecution.updateMany({
      where: { id, guildId, status: 'PROCESSING', leaseToken },
      data: {
        status: 'PENDING',
        attempts: { decrement: 1 },
        leaseToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        lastError: null,
      },
    });
  }

  static failExpired(item: AutomationExecution, now: Date) {
    return prisma.automationExecution.updateMany({
      where: {
        id: item.id,
        guildId: item.guildId,
        status: 'PROCESSING',
        leaseExpiresAt: { lte: now },
        attempts: { gte: item.maxAttempts },
      },
      data: { status: 'FAILED', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: 'LeaseExpired' },
    });
  }
}
