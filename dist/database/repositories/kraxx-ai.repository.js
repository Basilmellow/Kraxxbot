"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KraxxAiRepository = void 0;
const node_crypto_1 = require("node:crypto");
const client_1 = require("../client");
const kraxx_ai_contract_1 = require("../../services/kraxx-ai-contract");
const COUNTED = ['PENDING', 'SUCCESS', 'PROVIDER_ERROR', 'PROVIDER_UNKNOWN', 'DELIVERY_UNKNOWN'];
exports.KraxxAiRepository = {
    async policy(guildId) {
        const module = await client_1.prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'kraxx-ai' } } });
        if (!module)
            return null;
        try {
            return { enabled: module.enabled, settings: (0, kraxx_ai_contract_1.parseKraxxAiSettings)(module.config) };
        }
        catch {
            return null;
        }
    },
    async reserve(input) {
        return client_1.prisma.$transaction(async (tx) => {
            const prior = await tx.kraxxAiRequest.findUnique({ where: { requestId: input.requestId } });
            if (prior)
                return { kind: 'DUPLICATE', status: prior.status };
            // Serialize admission by tenant across worker instances; all admission checks and reservation are one transaction.
            await tx.$queryRaw `SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${`kraxx-ai:${input.guildId}`}, 0))) AS tenant_lock`;
            const duplicate = await tx.kraxxAiRequest.findUnique({ where: { requestId: input.requestId } });
            if (duplicate)
                return { kind: 'DUPLICATE', status: duplicate.status };
            const now = new Date();
            const recentUser = await tx.kraxxAiRequest.findFirst({ where: { guildId: input.guildId, userId: input.userId,
                    createdAt: { gte: new Date(now.getTime() - input.settings.userCooldownSeconds * 1000) }, status: { in: [...COUNTED] } }, orderBy: { createdAt: 'desc' } });
            const requestsInWindow = await tx.kraxxAiRequest.count({ where: { guildId: input.guildId,
                    createdAt: { gte: new Date(now.getTime() - 60_000) }, status: { in: [...COUNTED] } } });
            const reason = recentUser ? 'USER_COOLDOWN' : requestsInWindow >= input.settings.guildRequestsPerMinute ? 'GUILD_LIMIT' : null;
            const row = await tx.kraxxAiRequest.create({ data: { id: (0, node_crypto_1.randomUUID)(), guildId: input.guildId, userId: input.userId,
                    channelId: input.channelId, requestId: input.requestId, provider: 'GEMINI', model: 'gemini-3.8-flash',
                    status: reason ? 'RATE_LIMITED' : 'PENDING', errorCode: reason } });
            return reason ? { kind: 'RATE_LIMITED', reason } : { kind: 'RESERVED', rowId: row.id };
        }, { isolationLevel: 'ReadCommitted' });
    },
    async finish(rowId, data) {
        await client_1.prisma.kraxxAiRequest.update({ where: { id: rowId }, data: { ...data, errorCode: data.errorCode || null } });
    },
    async usage(guildId) {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        const rows = await client_1.prisma.kraxxAiRequest.groupBy({ by: ['status'], where: { guildId, createdAt: { gte: since } }, _count: { _all: true } });
        const counts = Object.fromEntries(rows.map(row => [row.status, row._count._all]));
        return { requestsToday: rows.reduce((sum, row) => sum + row._count._all, 0), successful: counts.SUCCESS || 0,
            failed: (counts.FAILURE || 0) + (counts.PROVIDER_ERROR || 0), rateLimited: counts.RATE_LIMITED || 0 };
    },
};
