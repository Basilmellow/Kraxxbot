"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageOperationService = exports.MessageOperationError = void 0;
const node_crypto_1 = require("node:crypto");
const client_1 = require("../database/client");
const audit_event_1 = require("./audit-event");
const discord_transport_1 = require("./discord-transport");
const SNOWFLAKE = /^\d{17,20}$/;
const KEY = /^[A-Za-z0-9_-]{16,128}$/;
const LEASE_MS = 60_000;
class MessageOperationError extends Error {
    statusCode;
    constructor(statusCode, code) {
        super(code);
        this.statusCode = statusCode;
        this.name = code;
    }
}
exports.MessageOperationError = MessageOperationError;
function validate(input) {
    if (!SNOWFLAKE.test(input.guildId) || !SNOWFLAKE.test(input.actorId) || !SNOWFLAKE.test(input.channelId))
        throw new MessageOperationError(400, 'INVALID_MESSAGE_TENANT');
    if (!KEY.test(input.idempotencyKey))
        throw new MessageOperationError(400, 'INVALID_IDEMPOTENCY_KEY');
    if (!['SEND', 'EDIT', 'DELETE', 'REPLY', 'PIN'].includes(input.operationType))
        throw new MessageOperationError(400, 'INVALID_MESSAGE_OPERATION');
    if (['EDIT', 'DELETE', 'REPLY', 'PIN'].includes(input.operationType) && (!input.targetMessageId || !SNOWFLAKE.test(input.targetMessageId)))
        throw new MessageOperationError(400, 'INVALID_TARGET_MESSAGE');
    if (input.operationType === 'SEND' || input.operationType === 'EDIT' || input.operationType === 'REPLY') {
        if (input.content !== undefined && (typeof input.content !== 'string' || input.content.length > 2000))
            throw new MessageOperationError(400, 'INVALID_MESSAGE_CONTENT');
        if (input.embeds !== undefined && (!Array.isArray(input.embeds) || input.embeds.length > 10 || JSON.stringify(input.embeds).length > 60_000))
            throw new MessageOperationError(400, 'INVALID_MESSAGE_EMBEDS');
        if (input.components !== undefined && (!Array.isArray(input.components) || input.components.length > 5 || JSON.stringify(input.components).length > 20_000))
            throw new MessageOperationError(400, 'INVALID_MESSAGE_COMPONENTS');
        if (!(input.content?.length) && !(input.embeds?.length))
            throw new MessageOperationError(400, 'EMPTY_MESSAGE');
        const mode = input.mentionMode || 'NONE';
        if (!['NONE', 'EVERYONE', 'HERE', 'ROLE'].includes(mode))
            throw new MessageOperationError(400, 'INVALID_MENTION_MODE');
        if (mode === 'ROLE' && (!input.mentionRoleId || !SNOWFLAKE.test(input.mentionRoleId)))
            throw new MessageOperationError(400, 'INVALID_MENTION_ROLE');
    }
    (0, audit_event_1.assertAuditTenant)({ guildId: input.guildId, actorId: input.actorId });
}
function contentFor(input) {
    const content = input.content;
    switch (input.mentionMode || 'NONE') {
        case 'EVERYONE': return content ? `@everyone\n${content}` : '@everyone';
        case 'HERE': return content ? `@here\n${content}` : '@here';
        case 'ROLE': return content ? `<@&${input.mentionRoleId}>\n${content}` : `<@&${input.mentionRoleId}>`;
        default: return content;
    }
}
function allowedMentions(input) {
    if (input.mentionMode === 'ROLE')
        return { parse: [], roles: [input.mentionRoleId] };
    if (input.mentionMode === 'EVERYONE' || input.mentionMode === 'HERE')
        return { parse: ['everyone'] };
    return { parse: [] };
}
function hashInput(input) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({
        operationType: input.operationType, channelId: input.channelId, targetMessageId: input.targetMessageId || null,
        content: input.content ?? null, embeds: input.embeds ?? null, components: input.components ?? null, mentionMode: input.mentionMode || 'NONE',
        mentionRoleId: input.mentionRoleId || null,
    })).digest('hex');
}
function safeErrorCode(error) {
    if (error instanceof MessageOperationError)
        return error.name;
    if (error instanceof discord_transport_1.DiscordApiError)
        return `DISCORD_${error.status}`;
    if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number')
        return `DISCORD_${error.status}`;
    return error instanceof Error && /^[A-Za-z0-9_-]{1,64}$/.test(error.name) ? error.name : 'UNKNOWN_ERROR';
}
function outcomeFor(error) {
    if (error instanceof MessageOperationError)
        return 'FAILURE';
    if (error instanceof discord_transport_1.DiscordApiError)
        return error.status >= 400 && error.status < 500 && error.status !== 408 ? 'FAILURE' : 'UNKNOWN';
    if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number')
        return error.status >= 400 && error.status < 500 && error.status !== 408 ? 'FAILURE' : 'UNKNOWN';
    return 'UNKNOWN';
}
class MessageOperationService {
    static async getStatus(id, guildId, actorId, source) {
        let operation = await client_1.prisma.messageOperation.findFirst({ where: { id, guildId, actorId } });
        if (!operation)
            return null;
        if (operation.status === 'PENDING' && operation.leaseExpiresAt && operation.leaseExpiresAt <= new Date()) {
            await this.expirePending(operation.id, guildId, actorId, source, operation.operationType, operation.targetMessageId || operation.channelId, operation.leaseToken);
            operation = await client_1.prisma.messageOperation.findFirst({ where: { id, guildId, actorId } });
        }
        return operation;
    }
    static async execute(input, adapter, beforeCreate) {
        validate(input);
        await adapter.authorize(input);
        const inputHash = hashInput(input);
        const leaseToken = (0, node_crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + LEASE_MS);
        let operation;
        let ownsOperation = false;
        try {
            operation = await client_1.prisma.$transaction(async (tx) => {
                const created = await tx.messageOperation.create({ data: {
                        guildId: input.guildId, actorId: input.actorId, operationType: input.operationType,
                        idempotencyKey: input.idempotencyKey, inputHash, channelId: input.channelId,
                        targetMessageId: input.targetMessageId || null, status: 'PENDING', leaseToken, leaseExpiresAt: expiresAt,
                    } });
                // Admission checks run with reservation: duplicates skip them, and rejection rolls back.
                await beforeCreate?.(tx);
                await tx.auditLog.create({ data: {
                        guildId: input.guildId, executorId: input.actorId, targetId: input.targetMessageId || input.channelId,
                        action: 'MESSAGE_OPERATION', details: (0, audit_event_1.createAuditDetails)({ source: input.source || 'BOT', targetType: 'MESSAGE', outcome: 'PENDING',
                            metadata: { operationId: created.id, operationType: input.operationType, channelId: input.channelId } }),
                    } });
                return created;
            });
            ownsOperation = true;
        }
        catch (error) {
            if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002')
                throw error;
            operation = await client_1.prisma.messageOperation.findUnique({ where: { guildId_idempotencyKey: { guildId: input.guildId, idempotencyKey: input.idempotencyKey } } });
            if (!operation)
                throw error;
            if (operation.actorId !== input.actorId || operation.operationType !== input.operationType || operation.inputHash !== inputHash)
                throw new MessageOperationError(409, 'IDEMPOTENCY_KEY_CONFLICT');
        }
        if (!operation)
            throw new MessageOperationError(500, 'OPERATION_RESERVATION_FAILED');
        if (!ownsOperation) {
            if (operation.status !== 'PENDING')
                return this.result(operation);
            if (operation.leaseExpiresAt && operation.leaseExpiresAt > new Date())
                return this.result(operation);
            return this.expirePending(operation.id, input.guildId, input.actorId, input.source || 'BOT', input.operationType, operation.targetMessageId || operation.channelId, operation.leaseToken);
        }
        try {
            let messageId = input.targetMessageId;
            let alreadyDeleted = false;
            if (input.operationType === 'SEND' || input.operationType === 'REPLY') {
                const sent = await adapter.send({ channelId: input.channelId, content: contentFor(input), embeds: input.embeds, components: input.components,
                    allowedMentions: allowedMentions(input), nonce: (0, node_crypto_1.createHash)('sha256').update(`${input.guildId}:${input.idempotencyKey}`).digest('hex').slice(0, 25),
                    ...(input.operationType === 'REPLY' ? { replyToMessageId: input.targetMessageId } : {}) });
                messageId = sent.messageId;
            }
            else if (input.operationType === 'EDIT') {
                const edited = await adapter.edit({ channelId: input.channelId, messageId: input.targetMessageId, content: contentFor(input),
                    embeds: input.embeds, components: input.components, allowedMentions: allowedMentions(input) });
                messageId = edited.messageId;
            }
            else if (input.operationType === 'PIN') {
                if (!adapter.pin)
                    throw new MessageOperationError(501, 'PIN_NOT_SUPPORTED');
                await adapter.pin({ channelId: input.channelId, messageId: input.targetMessageId });
            }
            else {
                const deleted = await adapter.delete({ channelId: input.channelId, messageId: input.targetMessageId });
                alreadyDeleted = deleted.alreadyDeleted;
            }
            return await this.finalize({ id: operation.id, input, leaseToken, status: 'SUCCESS', messageId, alreadyDeleted });
        }
        catch (error) {
            const status = outcomeFor(error);
            const errorCode = safeErrorCode(error);
            return await this.finalize({ id: operation.id, input, leaseToken, status, errorCode });
        }
    }
    static async finalize(args) {
        try {
            const updated = await client_1.prisma.$transaction(async (tx) => {
                const result = await tx.messageOperation.updateMany({
                    where: { id: args.id, guildId: args.input.guildId, status: 'PENDING', leaseToken: args.leaseToken },
                    data: { status: args.status, discordMessageId: args.messageId || null, wasAlreadyDeleted: args.alreadyDeleted || false,
                        errorCode: args.errorCode || null, leaseToken: null, leaseExpiresAt: null },
                });
                if (result.count)
                    await tx.auditLog.create({ data: {
                            guildId: args.input.guildId, executorId: args.input.actorId,
                            targetId: args.messageId || args.input.targetMessageId || args.input.channelId, action: 'MESSAGE_OPERATION',
                            details: (0, audit_event_1.createAuditDetails)({ source: args.input.source || 'BOT', targetType: 'MESSAGE', outcome: args.status,
                                metadata: { operationId: args.id, operationType: args.input.operationType, channelId: args.input.channelId,
                                    ...(args.errorCode ? { errorCode: args.errorCode } : {}), ...(args.alreadyDeleted ? { alreadyDeleted: true } : {}) } }),
                        } });
                return result;
            });
            if (!updated.count) {
                let current = await client_1.prisma.messageOperation.findUnique({ where: { id: args.id } });
                if (current?.status === 'UNKNOWN' && args.messageId && !current.discordMessageId) {
                    await client_1.prisma.messageOperation.updateMany({ where: { id: args.id, guildId: args.input.guildId, status: 'UNKNOWN', discordMessageId: null },
                        data: { discordMessageId: args.messageId } }).catch(() => ({ count: 0 }));
                    current = await client_1.prisma.messageOperation.findUnique({ where: { id: args.id } });
                }
                if (current)
                    return this.result(current);
            }
            return { operationId: args.id, status: args.status, ...(args.messageId ? { messageId: args.messageId } : {}),
                ...(args.errorCode ? { errorCode: args.errorCode } : {}), ...(args.alreadyDeleted ? { alreadyDeleted: true } : {}) };
        }
        catch {
            const fallbackData = { status: 'UNKNOWN', discordMessageId: args.messageId || null, wasAlreadyDeleted: args.alreadyDeleted || false,
                errorCode: 'FINALIZATION_FAILED', leaseToken: null, leaseExpiresAt: null };
            try {
                await client_1.prisma.$transaction(async (tx) => {
                    const changed = await tx.messageOperation.updateMany({ where: { id: args.id, guildId: args.input.guildId, status: 'PENDING', leaseToken: args.leaseToken }, data: fallbackData });
                    if (changed.count)
                        await tx.auditLog.create({ data: { guildId: args.input.guildId, executorId: args.input.actorId,
                                targetId: args.messageId || args.input.targetMessageId || args.input.channelId, action: 'MESSAGE_OPERATION',
                                details: (0, audit_event_1.createAuditDetails)({ source: args.input.source || 'BOT', targetType: 'MESSAGE', outcome: 'UNKNOWN',
                                    metadata: { operationId: args.id, operationType: args.input.operationType, channelId: args.input.channelId, errorCode: 'FINALIZATION_FAILED' } }) } });
                });
            }
            catch {
                await client_1.prisma.messageOperation.updateMany({ where: { id: args.id, guildId: args.input.guildId, status: 'PENDING', leaseToken: args.leaseToken }, data: fallbackData }).catch(() => ({ count: 0 }));
            }
            return { operationId: args.id, status: 'UNKNOWN', ...(args.messageId ? { messageId: args.messageId } : {}), errorCode: 'FINALIZATION_FAILED' };
        }
    }
    static async expirePending(id, guildId, actorId, source, operationType, targetId, leaseToken) {
        let changed = { count: 0 };
        try {
            changed = await client_1.prisma.$transaction(async (tx) => {
                const result = await tx.messageOperation.updateMany({ where: { id, guildId, status: 'PENDING', leaseToken, leaseExpiresAt: { lte: new Date() } },
                    data: { status: 'UNKNOWN', leaseToken: null, leaseExpiresAt: null, errorCode: 'OPERATION_LEASE_EXPIRED' } });
                if (result.count)
                    await tx.auditLog.create({ data: { guildId, executorId: actorId, targetId, action: 'MESSAGE_OPERATION',
                            details: (0, audit_event_1.createAuditDetails)({ source, targetType: 'MESSAGE', outcome: 'UNKNOWN', metadata: { operationId: id, operationType, errorCode: 'OPERATION_LEASE_EXPIRED' } }) } });
                return result;
            });
        }
        catch {
            changed = await client_1.prisma.messageOperation.updateMany({ where: { id, guildId, status: 'PENDING', leaseToken, leaseExpiresAt: { lte: new Date() } },
                data: { status: 'UNKNOWN', leaseToken: null, leaseExpiresAt: null, errorCode: 'AUDIT_FINALIZATION_FAILED' } }).catch(() => ({ count: 0 }));
        }
        const current = await client_1.prisma.messageOperation.findUnique({ where: { id } });
        if (!current)
            return { operationId: id, status: 'UNKNOWN', errorCode: 'OPERATION_UNAVAILABLE' };
        if (!changed.count && current.status === 'PENDING')
            return this.result(current);
        return this.result(current);
    }
    static result(operation) {
        return { operationId: operation.id, status: operation.status,
            ...(operation.discordMessageId ? { messageId: operation.discordMessageId } : {}), ...(operation.errorCode ? { errorCode: operation.errorCode } : {}),
            ...(operation.wasAlreadyDeleted ? { alreadyDeleted: true } : {}) };
    }
}
exports.MessageOperationService = MessageOperationService;
