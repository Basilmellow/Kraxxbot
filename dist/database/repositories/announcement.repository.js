"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementRepository = void 0;
const client_1 = require("../client");
const node_crypto_1 = require("node:crypto");
const audit_event_1 = require("../../services/audit-event");
class AnnouncementRepository {
    static async enqueueDelivery(data) {
        const idempotencyKey = (0, node_crypto_1.createHash)('sha256').update(`bot-announcement:${data.guildId}:${data.interactionId}`).digest('hex');
        try {
            return await client_1.prisma.$transaction(async (transaction) => {
                const existing = await transaction.scheduledAnnouncement.findUnique({ where: { idempotencyKey } });
                if (existing)
                    return existing;
                const scheduled = await transaction.scheduledAnnouncement.create({ data: {
                        guildId: data.guildId, channelId: data.channelId, title: data.title, content: data.content,
                        department: data.department, announcementType: data.type, mentionType: data.mentionType,
                        mentionRoleId: data.mentionRoleId || null, embedPayload: data.embedPayload || null,
                        scheduledFor: new Date(), createdBy: data.authorId, idempotencyKey,
                    } });
                await transaction.auditLog.create({ data: {
                        guildId: data.guildId, executorId: data.authorId, targetId: scheduled.id, action: 'ANNOUNCEMENT_ENQUEUE',
                        details: (0, audit_event_1.createAuditDetails)({ source: 'BOT', targetType: 'SCHEDULED_ANNOUNCEMENT', outcome: 'SUCCESS',
                            metadata: { channelId: data.channelId, title: data.title, idempotencyKey } }),
                    } });
                return scheduled;
            });
        }
        catch (error) {
            if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002')
                throw error;
            const existing = await client_1.prisma.scheduledAnnouncement.findUnique({ where: { idempotencyKey } });
            if (!existing || existing.guildId !== data.guildId || existing.createdBy !== data.authorId)
                throw error;
            return existing;
        }
    }
    static async create(data) {
        return client_1.prisma.announcement.create({
            data: {
                guildId: data.guildId,
                title: data.title,
                content: data.content,
                department: data.department || 'GENERAL',
                type: data.type || 'GENERAL',
                authorId: data.authorId,
                channelId: data.channelId,
                messageId: data.messageId,
                mentionRole: data.mentionRole,
                imageUrl: data.imageUrl,
            },
        });
    }
    static async findRecentByGuild(guildId, limit = 10) {
        return client_1.prisma.announcement.findMany({
            where: { guildId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}
exports.AnnouncementRepository = AnnouncementRepository;
