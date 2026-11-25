"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollService = void 0;
exports.validatePollDefinition = validatePollDefinition;
exports.pollInteractionMatches = pollInteractionMatches;
exports.parsePollOptions = parsePollOptions;
exports.pollResults = pollResults;
exports.pollComponents = pollComponents;
exports.pollEmbed = pollEmbed;
const node_crypto_1 = require("node:crypto");
const client_1 = require("../database/client");
const audit_event_1 = require("./audit-event");
function validatePollDefinition(question, rawOptions, durationHours) {
    if (typeof question !== 'string' || !question.trim() || question.trim().length > 256)
        throw new Error('INVALID_POLL_QUESTION');
    if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 5
        || rawOptions.some(option => typeof option !== 'string' || !option.trim() || option.trim().length > 80))
        throw new Error('INVALID_POLL_OPTIONS');
    const options = rawOptions.map(option => option.trim());
    if (new Set(options.map(option => option.toLocaleLowerCase())).size !== options.length)
        throw new Error('DUPLICATE_POLL_OPTIONS');
    if (durationHours !== null && (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 168))
        throw new Error('INVALID_POLL_EXPIRY');
    return { question: question.trim(), options, durationHours: durationHours };
}
function pollInteractionMatches(poll, interaction, optionCount) {
    return Boolean(poll.messageId && poll.id === interaction.pollId && poll.guildId === interaction.guildId
        && poll.channelId === interaction.channelId && poll.messageId === interaction.messageId
        && Number.isInteger(interaction.optionIndex) && interaction.optionIndex >= 0 && interaction.optionIndex < optionCount);
}
function parsePollOptions(raw) {
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        return [];
    }
    if (!Array.isArray(value))
        return [];
    return value.map(item => typeof item === 'string' ? { text: item, votes: 0 }
        : item && typeof item === 'object' && 'text' in item && typeof item.text === 'string'
            ? { text: item.text, votes: 0 } : null).filter((item) => item !== null);
}
function pollResults(options, counts) {
    const totalVotes = counts.reduce((sum, count) => sum + count, 0);
    return { totalVotes, results: options.map((option, index) => ({ option: option.text, votes: counts[index] || 0,
            percentage: totalVotes ? Math.round(((counts[index] || 0) / totalVotes) * 1000) / 10 : 0 })) };
}
function pollComponents(pollId, options, closed) {
    const buttons = options.slice(0, 25).map((option, index) => ({ type: 2, style: 2, label: option.text.slice(0, 80),
        custom_id: `kraxx_poll:${pollId}:${index}`, disabled: closed }));
    const rows = [];
    for (let index = 0; index < buttons.length; index += 5)
        rows.push({ type: 1, components: buttons.slice(index, index + 5) });
    return rows;
}
function pollEmbed(question, options, counts, closed = false) {
    const { results, totalVotes } = pollResults(options, counts);
    return { title: `📊 ${question}`.slice(0, 256), description: results.map((result, index) => `**${index + 1}. ${result.option}**${closed ? ` — ${result.votes} vote${result.votes === 1 ? '' : 's'} (${result.percentage}%)` : ''}`).join('\n').slice(0, 4000), color: closed ? 0x667085 : 0x5865f2,
        footer: { text: closed ? `Poll closed • ${totalVotes} total vote${totalVotes === 1 ? '' : 's'}` : 'Select one option to cast your vote' } };
}
class PollService {
    static async reserveCreation(input) {
        try {
            const poll = await client_1.prisma.$transaction(async (tx) => {
                const created = await tx.poll.create({ data: { guildId: input.guildId, question: input.question, options: JSON.stringify(input.options),
                        channelId: input.channelId, messageId: null, isAnonymous: input.isAnonymous, expiresAt: input.expiresAt,
                        status: 'PENDING', createdBy: input.actorId, idempotencyKey: input.idempotencyKey, requestHash: input.requestHash,
                        messageSyncStatus: 'NEEDS_UPDATE' } });
                await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: created.id, action: 'POLL_CREATE',
                        details: (0, audit_event_1.createAuditDetails)({ source: 'DASHBOARD', targetType: 'POLL', outcome: 'PENDING', metadata: { channelId: input.channelId } }) } });
                return created;
            });
            return { poll, created: true };
        }
        catch (error) {
            if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002')
                throw error;
            const poll = await client_1.prisma.poll.findUnique({ where: { guildId_idempotencyKey: { guildId: input.guildId, idempotencyKey: input.idempotencyKey } } });
            if (!poll || poll.createdBy !== input.actorId || poll.requestHash !== input.requestHash)
                throw new Error('POLL_IDEMPOTENCY_CONFLICT');
            return { poll, created: false };
        }
    }
    static async publish(input, dispatch) {
        const { poll } = await this.reserveCreation(input);
        if (poll.status === 'ACTIVE' || poll.status === 'CLOSED')
            return { poll, status: 'SUCCESS' };
        if (poll.status === 'FAILED')
            return { poll, status: 'FAILURE' };
        let result;
        try {
            result = await dispatch({ guildId: input.guildId, actorId: input.actorId, source: 'DASHBOARD', operationType: 'SEND',
                idempotencyKey: `poll_${input.idempotencyKey}`, channelId: input.channelId,
                embeds: [pollEmbed(poll.question, parsePollOptions(poll.options), [])],
                components: pollComponents(poll.id, parsePollOptions(poll.options), false), mentionMode: 'NONE' });
        }
        catch {
            result = { operationId: '', status: 'FAILURE', errorCode: 'DISPATCH_NOT_STARTED' };
        }
        if (result.status === 'SUCCESS' && !result.messageId)
            result = { ...result, status: 'UNKNOWN', errorCode: 'MESSAGE_ID_UNCONFIRMED' };
        if (result.status === 'SUCCESS' && result.messageId) {
            try {
                await client_1.prisma.$transaction(async (tx) => {
                    const changed = await tx.poll.updateMany({ where: { id: poll.id, guildId: input.guildId, status: { in: ['PENDING', 'UNKNOWN'] } },
                        data: { status: 'ACTIVE', messageId: result.messageId, messageSyncStatus: 'SYNCED' } });
                    if (changed.count)
                        await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId,
                                targetId: poll.id, action: 'POLL_CREATE', details: (0, audit_event_1.createAuditDetails)({ source: 'DASHBOARD', targetType: 'POLL', outcome: 'SUCCESS',
                                    metadata: { channelId: input.channelId, messageId: result.messageId } }) } });
                });
                return { poll: await client_1.prisma.poll.findFirstOrThrow({ where: { id: poll.id, guildId: input.guildId } }), status: 'SUCCESS' };
            }
            catch {
                await client_1.prisma.$transaction(async (tx) => {
                    const changed = await tx.poll.updateMany({ where: { id: poll.id, guildId: input.guildId, status: { in: ['PENDING', 'UNKNOWN'] } },
                        data: { status: 'UNKNOWN', messageId: result.messageId } });
                    if (changed.count)
                        await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: poll.id,
                                action: 'POLL_CREATE', details: (0, audit_event_1.createAuditDetails)({ source: 'DASHBOARD', targetType: 'POLL', outcome: 'UNKNOWN',
                                    metadata: { channelId: input.channelId, errorCode: 'POLL_FINALIZATION_UNCONFIRMED' } }) } });
                }).catch(() => undefined);
                const current = await client_1.prisma.poll.findFirst({ where: { id: poll.id, guildId: input.guildId } });
                return { poll: current, status: current?.status === 'ACTIVE' ? 'SUCCESS' : 'UNKNOWN' };
            }
        }
        if (result.status === 'FAILURE') {
            await client_1.prisma.$transaction(async (tx) => {
                const changed = await tx.poll.updateMany({ where: { id: poll.id, guildId: input.guildId, status: { in: ['PENDING', 'UNKNOWN'] } }, data: { status: 'FAILED' } });
                if (changed.count)
                    await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: poll.id,
                            action: 'POLL_CREATE', details: (0, audit_event_1.createAuditDetails)({ source: 'DASHBOARD', targetType: 'POLL', outcome: 'FAILURE', metadata: { channelId: input.channelId } }) } });
            });
            return { poll: await client_1.prisma.poll.findFirstOrThrow({ where: { id: poll.id, guildId: input.guildId } }), status: 'FAILURE' };
        }
        if (result.status === 'UNKNOWN') {
            await client_1.prisma.$transaction(async (tx) => {
                const changed = await tx.poll.updateMany({ where: { id: poll.id, guildId: input.guildId, status: { in: ['PENDING', 'UNKNOWN'] } },
                    data: { status: 'UNKNOWN', messageId: result.messageId || null } });
                if (changed.count)
                    await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: poll.id,
                            action: 'POLL_CREATE', details: (0, audit_event_1.createAuditDetails)({ source: 'DASHBOARD', targetType: 'POLL', outcome: 'UNKNOWN', metadata: { channelId: input.channelId } }) } });
            });
        }
        return { poll: await client_1.prisma.poll.findFirstOrThrow({ where: { id: poll.id, guildId: input.guildId } }), status: result.status };
    }
    static async vote(input) {
        (0, audit_event_1.assertAuditTenant)({ guildId: input.guildId, actorId: input.userId });
        if (!Number.isInteger(input.optionIndex) || input.optionIndex < 0)
            throw new Error('INVALID_POLL_OPTION');
        try {
            return await client_1.prisma.$transaction(async (tx) => {
                await tx.$queryRaw `SELECT "id" FROM "Poll" WHERE "id" = ${input.pollId} AND "guildId" = ${input.guildId} FOR UPDATE`;
                const poll = await tx.poll.findFirst({ where: { id: input.pollId, guildId: input.guildId } });
                if (!poll)
                    throw new Error('POLL_NOT_FOUND');
                if (poll.status !== 'ACTIVE' || (poll.expiresAt && poll.expiresAt <= (input.now || new Date())))
                    throw new Error('POLL_CLOSED');
                const options = parsePollOptions(poll.options);
                if (input.optionIndex >= options.length)
                    throw new Error('INVALID_POLL_OPTION');
                const existing = await tx.pollVote.findUnique({ where: { pollId_userId: { pollId: poll.id, userId: input.userId } } });
                if (existing)
                    return { status: 'ALREADY_VOTED', optionIndex: existing.optionIndex };
                await tx.pollVote.create({ data: { id: (0, node_crypto_1.randomUUID)(), guildId: input.guildId, pollId: poll.id, userId: input.userId, optionIndex: input.optionIndex } });
                return { status: 'VOTED', optionIndex: input.optionIndex };
            }, { isolationLevel: 'ReadCommitted' });
        }
        catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
                const existing = await client_1.prisma.pollVote.findUnique({ where: { pollId_userId: { pollId: input.pollId, userId: input.userId } } });
                if (existing?.guildId === input.guildId)
                    return { status: 'ALREADY_VOTED', optionIndex: existing.optionIndex };
            }
            throw error;
        }
    }
    static async counts(guildId, pollId, optionCount) {
        const grouped = await client_1.prisma.pollVote.groupBy({ by: ['optionIndex'], where: { guildId, pollId }, _count: { _all: true } });
        const counts = Array(optionCount).fill(0);
        for (const row of grouped)
            if (row.optionIndex >= 0 && row.optionIndex < optionCount)
                counts[row.optionIndex] = row._count._all;
        return counts;
    }
    static async close(input) {
        (0, audit_event_1.assertAuditTenant)({ guildId: input.guildId, actorId: input.actorId });
        return client_1.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT "id" FROM "Poll" WHERE "id" = ${input.pollId} AND "guildId" = ${input.guildId} FOR UPDATE`;
            const poll = await tx.poll.findFirst({ where: { id: input.pollId, guildId: input.guildId } });
            if (!poll)
                throw new Error('POLL_NOT_FOUND');
            if (poll.status === 'CLOSED')
                return { poll, changed: false };
            if (poll.status !== 'ACTIVE')
                throw new Error('POLL_NOT_OPEN');
            const closedAt = input.now || new Date();
            const update = await tx.poll.updateMany({ where: { id: input.pollId, guildId: input.guildId, status: 'ACTIVE' },
                data: { status: 'CLOSED', closedAt, closedBy: input.actorId, messageSyncStatus: 'NEEDS_UPDATE' } });
            if (update.count)
                await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId,
                        targetId: input.pollId, action: input.reason === 'EXPIRED' ? 'POLL_EXPIRE' : 'POLL_CLOSE',
                        details: (0, audit_event_1.createAuditDetails)({ source: input.reason === 'EXPIRED' ? 'BOT' : 'DASHBOARD', targetType: 'POLL', outcome: 'SUCCESS', metadata: { reason: input.reason || 'MANUAL' } }) } });
            return { poll: { ...poll, status: 'CLOSED', closedAt, closedBy: input.actorId, messageSyncStatus: 'NEEDS_UPDATE' }, changed: Boolean(update.count) };
        });
    }
    static async markMessageSynced(guildId, pollId) {
        await client_1.prisma.poll.updateMany({ where: { guildId, id: pollId, status: 'CLOSED' }, data: { messageSyncStatus: 'SYNCED' } });
    }
    static async expireDue(now = new Date(), limit = 100) {
        const due = await client_1.prisma.poll.findMany({ where: { status: 'ACTIVE', expiresAt: { lte: now } }, orderBy: { expiresAt: 'asc' }, take: limit });
        const closed = [];
        for (const poll of due) {
            try {
                const result = await this.close({ guildId: poll.guildId, pollId: poll.id, actorId: poll.createdBy, reason: 'EXPIRED', now });
                if (result.changed)
                    closed.push(result.poll);
            }
            catch (error) {
                if (!(error instanceof Error) || error.message !== 'POLL_NOT_OPEN')
                    throw error;
            }
        }
        return closed;
    }
}
exports.PollService = PollService;
