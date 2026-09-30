import { randomUUID } from 'node:crypto';
import { prisma } from '../client';
import type { KraxxAiSettings } from '../../services/kraxx-ai-contract';
import { parseKraxxAiSettings } from '../../services/kraxx-ai-contract';

export type AiReservation = { kind: 'RESERVED'; rowId: string } | { kind: 'DUPLICATE'; status: string } | { kind: 'RATE_LIMITED'; reason: 'USER_COOLDOWN' | 'GUILD_LIMIT' };
const COUNTED = ['PENDING', 'SUCCESS', 'PROVIDER_ERROR', 'PROVIDER_UNKNOWN', 'DELIVERY_UNKNOWN'] as const;

export const KraxxAiRepository = {
  async policy(guildId: string): Promise<{ enabled: boolean; settings: KraxxAiSettings } | null> {
    const module = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'kraxx-ai' } } });
    if (!module) return null;
    try { return { enabled: module.enabled, settings: parseKraxxAiSettings(module.config) }; }
    catch { return null; }
  },

  async reserve(input: { guildId: string; userId: string; channelId: string; requestId: string; settings: KraxxAiSettings }): Promise<AiReservation> {
    return prisma.$transaction(async tx => {
      const prior = await tx.kraxxAiRequest.findUnique({ where: { requestId: input.requestId } });
      if (prior) return { kind: 'DUPLICATE', status: prior.status } as const;
      // Serialize admission by tenant across worker instances; all admission checks and reservation are one transaction.
      await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${`kraxx-ai:${input.guildId}`}, 0))) AS tenant_lock`;
      const duplicate = await tx.kraxxAiRequest.findUnique({ where: { requestId: input.requestId } });
      if (duplicate) return { kind: 'DUPLICATE', status: duplicate.status } as const;
      const now = new Date();
      const recentUser = await tx.kraxxAiRequest.findFirst({ where: { guildId: input.guildId, userId: input.userId,
        createdAt: { gte: new Date(now.getTime() - input.settings.userCooldownSeconds * 1000) }, status: { in: [...COUNTED] } }, orderBy: { createdAt: 'desc' } });
      const requestsInWindow = await tx.kraxxAiRequest.count({ where: { guildId: input.guildId,
        createdAt: { gte: new Date(now.getTime() - 60_000) }, status: { in: [...COUNTED] } } });
      const reason = recentUser ? 'USER_COOLDOWN' : requestsInWindow >= input.settings.guildRequestsPerMinute ? 'GUILD_LIMIT' : null;
      const row = await tx.kraxxAiRequest.create({ data: { id: randomUUID(), guildId: input.guildId, userId: input.userId,
        channelId: input.channelId, requestId: input.requestId, provider: 'GEMINI', model: 'gemini-3.8-flash',
        status: reason ? 'RATE_LIMITED' : 'PENDING', errorCode: reason } });
      return reason ? { kind: 'RATE_LIMITED', reason } as const : { kind: 'RESERVED', rowId: row.id } as const;
    }, { isolationLevel: 'ReadCommitted' });
  },

  async finish(rowId: string, data: { status: 'SUCCESS' | 'PROVIDER_ERROR' | 'PROVIDER_UNKNOWN' | 'DELIVERY_UNKNOWN' | 'FAILURE'; model?: string; latencyMs: number; inputTokens?: number; outputTokens?: number; errorCode?: string }) {
    await prisma.kraxxAiRequest.update({ where: { id: rowId }, data: { ...data, errorCode: data.errorCode || null } });
  },

  async usage(guildId: string) {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const rows = await prisma.kraxxAiRequest.groupBy({ by: ['status'], where: { guildId, createdAt: { gte: since } }, _count: { _all: true } });
    const counts = Object.fromEntries(rows.map(row => [row.status, row._count._all]));
    return { requestsToday: rows.reduce((sum, row) => sum + row._count._all, 0), successful: counts.SUCCESS || 0,
      failed: (counts.FAILURE || 0) + (counts.PROVIDER_ERROR || 0), rateLimited: counts.RATE_LIMITED || 0 };
  },
};
