"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionService = exports.SUGGESTION_STATUSES = void 0;
exports.validateSuggestion = validateSuggestion;
exports.suggestionEmbed = suggestionEmbed;
exports.suggestionPanel = suggestionPanel;
exports.suggestionPanelMatches = suggestionPanelMatches;
const node_crypto_1 = require("node:crypto");
const client_1 = require("../database/client");
const audit_event_1 = require("./audit-event");
exports.SUGGESTION_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED'];
const SNOWFLAKE = /^\d{17,20}$/;
const KEY = /^[A-Za-z0-9_-]{16,128}$/;
const deliveryOutcome = (status) => status === 'SYNCED' ? 'SUCCESS' : status === 'FAILURE' ? 'FAILURE' : 'UNKNOWN';
function validateSuggestion(title, content) {
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 100)
        throw new Error('INVALID_SUGGESTION_TITLE');
    if (typeof content !== 'string' || !content.trim() || content.trim().length > 3000)
        throw new Error('INVALID_SUGGESTION_CONTENT');
    return { title: title.trim(), content: content.trim() };
}
function suggestionEmbed(suggestion) {
    return { title: `💡 ${suggestion.title}`.slice(0, 256), description: suggestion.content.slice(0, 4000), color: suggestion.status === 'REJECTED' ? 0x667085 : 0xf4b400,
        fields: [{ name: 'Status', value: suggestion.status, inline: true }, ...(suggestion.reviewerNotes ? [{ name: 'Staff note', value: suggestion.reviewerNotes.slice(0, 1024), inline: false }] : [])],
        footer: { text: `Suggestion • ${suggestion.id}` }, author: { name: `Submitted by ${suggestion.authorId}` } };
}
function suggestionPanel(operationKey) {
    return { embeds: [{ title: 'Share a suggestion', description: 'Have an idea for this community? Submit it for staff review.', color: 0xf4b400,
                footer: { text: `Suggestion panel • ${operationKey}` } }],
        components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Submit a Suggestion', custom_id: 'kraxx_suggestion_submit' }] }] };
}
function suggestionPanelMatches(config, interaction) {
    return config.enabled === true && typeof interaction.guildId === 'string' && typeof interaction.channelId === 'string' && typeof interaction.messageId === 'string'
        && config.guildId === interaction.guildId && config.channelId === interaction.channelId && config.messageId === interaction.messageId;
}
function assertTenantIds(guildId, actorId, channelId) {
    if (!SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(actorId) || !SNOWFLAKE.test(channelId))
        throw new Error('INVALID_SUGGESTION_TENANT');
    (0, audit_event_1.assertAuditTenant)({ guildId, actorId });
}
class SuggestionService {
    static async recoverSubmission(input, authorize, findDiscordMessage) {
        (0, audit_event_1.assertAuditTenant)({ guildId: input.guildId, actorId: input.actorId });
        await authorize();
        const suggestion = await client_1.prisma.suggestion.findFirst({ where: { id: input.suggestionId, guildId: input.guildId } });
        if (!suggestion)
            throw new Error('SUGGESTION_NOT_FOUND');
        if (!suggestion.idempotencyKey || !suggestion.authorId)
            throw new Error('SUGGESTION_RECOVERY_UNAVAILABLE');
        const operation = await client_1.prisma.messageOperation.findUnique({ where: { guildId_idempotencyKey: { guildId: input.guildId, idempotencyKey: `suggestion_${suggestion.idempotencyKey}` } } });
        if (!operation) {
            await client_1.prisma.suggestion.updateMany({ where: { id: suggestion.id, guildId: input.guildId, deliveryStatus: { in: ['PENDING', 'UNKNOWN'] } }, data: { deliveryStatus: 'FAILURE' } });
            return { suggestion: await client_1.prisma.suggestion.findFirstOrThrow({ where: { id: suggestion.id, guildId: input.guildId } }), operationStatus: 'FAILURE' };
        }
        if (operation.actorId !== suggestion.authorId || operation.channelId !== suggestion.channelId)
            throw new Error('SUGGESTION_OPERATION_NOT_FOUND');
        const foundMessageId = operation.status !== 'FAILURE' && !operation.discordMessageId && suggestion.channelId && findDiscordMessage
            ? await findDiscordMessage(suggestion.channelId, suggestion.id) : null;
        const confirmedMessageId = operation.discordMessageId || foundMessageId;
        const deliveryStatus = confirmedMessageId && operation.status !== 'FAILURE' ? 'SYNCED' : operation.status === 'FAILURE' ? 'FAILURE' : 'UNKNOWN';
        await client_1.prisma.$transaction(async (tx) => {
            const changed = await tx.suggestion.updateMany({ where: { id: suggestion.id, guildId: input.guildId, deliveryStatus: { in: ['PENDING', 'UNKNOWN'] } },
                data: { deliveryStatus, ...(confirmedMessageId ? { messageId: confirmedMessageId } : {}) } });
            if (changed.count)
                await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: suggestion.id, action: 'SUGGESTION_RECOVERY',
                        details: (0, audit_event_1.createAuditDetails)({ source: 'DASHBOARD', targetType: 'SUGGESTION', outcome: deliveryOutcome(deliveryStatus), metadata: { operationId: operation.id } }) } });
        });
        return { suggestion: await client_1.prisma.suggestion.findFirstOrThrow({ where: { id: suggestion.id, guildId: input.guildId } }), operationStatus: deliveryStatus };
    }
    static async submit(input, authorize, dispatch) {
        assertTenantIds(input.guildId, input.actorId, input.channelId);
        if (!KEY.test(input.idempotencyKey))
            throw new Error('INVALID_IDEMPOTENCY_KEY');
        const definition = validateSuggestion(input.title, input.content);
        await authorize();
        const module = await client_1.prisma.guildModule.findUnique({ where: { guildId_module: { guildId: input.guildId, module: 'social' } } });
        if (!module?.enabled)
            throw new Error('SUGGESTIONS_DISABLED');
        let configuration;
        try {
            const parsed = JSON.parse(module.config || '{}');
            configuration = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        }
        catch {
            throw new Error('SUGGESTION_CONFIGURATION_INVALID');
        }
        if (configuration.suggestionChannelId !== input.channelId)
            throw new Error('SUGGESTION_CHANNEL_MISMATCH');
        const requestHash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ ...definition, channelId: input.channelId })).digest('hex');
        let created = false;
        const suggestion = await client_1.prisma.$transaction(async (tx) => {
            const insertion = await tx.suggestion.createMany({ data: { guildId: input.guildId, authorId: input.actorId, ...definition,
                    status: 'SUBMITTED', idempotencyKey: input.idempotencyKey, channelId: input.channelId, deliveryStatus: 'PENDING' }, skipDuplicates: true });
            const row = await tx.suggestion.findUnique({ where: { guildId_idempotencyKey: { guildId: input.guildId, idempotencyKey: input.idempotencyKey } } });
            if (!row)
                throw new Error('SUGGESTION_RESERVATION_FAILED');
            created = insertion.count === 1;
            if (created)
                await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: row.id, action: 'SUGGESTION_SUBMIT',
                        details: (0, audit_event_1.createAuditDetails)({ source: 'BOT', targetType: 'SUGGESTION', outcome: 'PENDING', metadata: { channelId: input.channelId } }) } });
            return row;
        });
        if (suggestion.authorId !== input.actorId || suggestion.title !== definition.title || suggestion.content !== definition.content || suggestion.channelId !== input.channelId
            || requestHash !== (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ title: suggestion.title, content: suggestion.content, channelId: suggestion.channelId })).digest('hex'))
            throw new Error('SUGGESTION_IDEMPOTENCY_CONFLICT');
        if (!suggestion)
            throw new Error('SUGGESTION_RESERVATION_FAILED');
        if (!created && suggestion.deliveryStatus !== 'PENDING' && suggestion.deliveryStatus !== 'UNKNOWN')
            return { suggestion, operationStatus: suggestion.deliveryStatus === 'SYNCED' ? 'SUCCESS' : 'FAILURE' };
        let result;
        try {
            result = await dispatch({ guildId: input.guildId, actorId: input.actorId, source: 'BOT', operationType: 'SEND',
                idempotencyKey: `suggestion_${input.idempotencyKey}`, channelId: input.channelId, embeds: [suggestionEmbed(suggestion)], mentionMode: 'NONE' });
        }
        catch {
            // MessageOperationService authorizes and reserves before sending; a thrown preflight/reservation error means no Discord send was attempted.
            result = { operationId: '', status: 'FAILURE', errorCode: 'DISPATCH_PREFLIGHT_FAILED' };
        }
        const deliveryStatus = result.status === 'SUCCESS' ? result.messageId ? 'SYNCED' : 'UNKNOWN' : result.status;
        try {
            await client_1.prisma.$transaction(async (tx) => {
                const changed = await tx.suggestion.updateMany({ where: { id: suggestion.id, guildId: input.guildId, deliveryStatus: { in: ['PENDING', 'UNKNOWN'] } },
                    data: { deliveryStatus, messageId: result.messageId || null } });
                if (changed.count)
                    await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: suggestion.id, action: 'SUGGESTION_SUBMIT',
                            details: (0, audit_event_1.createAuditDetails)({ source: 'BOT', targetType: 'SUGGESTION', outcome: deliveryOutcome(deliveryStatus), metadata: { channelId: input.channelId, ...(result.messageId ? { messageId: result.messageId } : {}) } }) } });
            });
        }
        catch {
            try {
                await client_1.prisma.$transaction(async (tx) => {
                    const changed = await tx.suggestion.updateMany({ where: { id: suggestion.id, guildId: input.guildId, deliveryStatus: { in: ['PENDING', 'UNKNOWN'] } },
                        data: { deliveryStatus: 'UNKNOWN', ...(result.messageId ? { messageId: result.messageId } : {}) } });
                    if (changed.count)
                        await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: suggestion.id, action: 'SUGGESTION_SUBMIT',
                                details: (0, audit_event_1.createAuditDetails)({ source: 'BOT', targetType: 'SUGGESTION', outcome: 'UNKNOWN', metadata: { channelId: input.channelId, errorCode: 'SUGGESTION_FINALIZATION_UNCONFIRMED' } }) } });
                });
            }
            catch {
                await client_1.prisma.suggestion.updateMany({ where: { id: suggestion.id, guildId: input.guildId, deliveryStatus: { in: ['PENDING', 'UNKNOWN'] } },
                    data: { deliveryStatus: 'UNKNOWN', ...(result.messageId ? { messageId: result.messageId } : {}) } }).catch(() => ({ count: 0 }));
            }
            return { suggestion: await client_1.prisma.suggestion.findFirstOrThrow({ where: { id: suggestion.id, guildId: input.guildId } }), operationStatus: 'UNKNOWN' };
        }
        return { suggestion: await client_1.prisma.suggestion.findFirstOrThrow({ where: { id: suggestion.id, guildId: input.guildId } }), operationStatus: deliveryStatus === 'SYNCED' ? 'SUCCESS' : deliveryStatus };
    }
    static async transition(input, authorize, dispatch) {
        (0, audit_event_1.assertAuditTenant)({ guildId: input.guildId, actorId: input.actorId });
        if (!exports.SUGGESTION_STATUSES.includes(input.status))
            throw new Error('INVALID_SUGGESTION_STATUS');
        const notes = input.reviewerNotes === undefined ? undefined : typeof input.reviewerNotes === 'string' && input.reviewerNotes.trim().length <= 1000 ? input.reviewerNotes.trim() : (() => { throw new Error('INVALID_REVIEWER_NOTES'); })();
        await authorize();
        const module = await client_1.prisma.guildModule.findUnique({ where: { guildId_module: { guildId: input.guildId, module: 'social' } } });
        if (!module?.enabled)
            throw new Error('SUGGESTIONS_DISABLED');
        const updated = await client_1.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT "id" FROM "Suggestion" WHERE "id" = ${input.suggestionId} AND "guildId" = ${input.guildId} FOR UPDATE`;
            const current = await tx.suggestion.findFirst({ where: { id: input.suggestionId, guildId: input.guildId } });
            if (!current)
                throw new Error('SUGGESTION_NOT_FOUND');
            if (current.deliveryStatus !== 'SYNCED' && current.deliveryStatus !== 'NOT_SENT')
                throw new Error('SUGGESTION_DELIVERY_UNCONFIRMED');
            if (current.status === input.status && (notes === undefined || notes === current.reviewerNotes) && current.messageSyncStatus === 'SYNCED')
                return current;
            const statusChanged = current.status !== input.status;
            const notesChanged = notes !== undefined && notes !== current.reviewerNotes;
            if ((statusChanged || notesChanged) && current.messageSyncStatus !== 'SYNCED')
                throw new Error('SUGGESTION_SYNC_UNCONFIRMED');
            if (!statusChanged && !notesChanged && current.messageSyncStatus !== 'SYNCED')
                return current;
            const allowed = { SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'], UNDER_REVIEW: ['APPROVED', 'REJECTED'], APPROVED: ['IMPLEMENTED', 'REJECTED'], REJECTED: [], IMPLEMENTED: [] };
            if (statusChanged && !allowed[current.status]?.includes(input.status))
                throw new Error('INVALID_SUGGESTION_TRANSITION');
            const syncKey = current.messageSyncStatus === 'SYNCED' ? `suggestion_review_${(0, node_crypto_1.randomUUID)().replace(/-/g, '')}` : current.messageSyncKey || `suggestion_review_${(0, node_crypto_1.randomUUID)().replace(/-/g, '')}`;
            const result = await tx.suggestion.updateMany({ where: { id: current.id, guildId: input.guildId, status: current.status }, data: {
                    status: input.status, reviewerId: input.actorId, reviewedAt: new Date(), messageSyncKey: syncKey,
                    messageSyncStatus: current.messageId ? 'NEEDS_UPDATE' : 'SYNCED', ...(notes !== undefined ? { reviewerNotes: notes || null } : {}),
                } });
            if (!result.count)
                throw new Error('SUGGESTION_TRANSITION_CONFLICT');
            await tx.auditLog.create({ data: { guildId: input.guildId, executorId: input.actorId, targetId: current.id,
                    action: input.status === 'APPROVED' ? 'SUGGESTION_ACCEPT' : input.status === 'REJECTED' ? 'SUGGESTION_REJECT' : input.status === 'IMPLEMENTED' ? 'SUGGESTION_IMPLEMENT' : 'SUGGESTION_REVIEW',
                    details: (0, audit_event_1.createAuditDetails)({ source: 'DASHBOARD', targetType: 'SUGGESTION', outcome: 'SUCCESS', metadata: { from: current.status, to: input.status } }) } });
            return tx.suggestion.findFirstOrThrow({ where: { id: current.id, guildId: input.guildId } });
        });
        if (updated.messageId && updated.channelId && dispatch && updated.messageSyncStatus !== 'SYNCED') {
            const result = await dispatch({ guildId: input.guildId, actorId: input.actorId, source: 'DASHBOARD', operationType: 'EDIT', idempotencyKey: updated.messageSyncKey,
                channelId: updated.channelId, targetMessageId: updated.messageId, embeds: [suggestionEmbed(updated)], mentionMode: 'NONE' });
            const syncStatus = result.status === 'SUCCESS' ? 'SYNCED' : result.status;
            const persisted = await client_1.prisma.suggestion.updateMany({ where: { id: updated.id, guildId: input.guildId, messageSyncKey: updated.messageSyncKey }, data: { messageSyncStatus: syncStatus } }).catch(() => ({ count: 0 }));
            const current = await client_1.prisma.suggestion.findFirstOrThrow({ where: { id: updated.id, guildId: input.guildId } });
            return { suggestion: current, operationStatus: persisted.count || current.messageSyncStatus === 'SYNCED' ? result.status : 'UNKNOWN' };
        }
        return { suggestion: updated, operationStatus: 'SUCCESS' };
    }
}
exports.SuggestionService = SuggestionService;
