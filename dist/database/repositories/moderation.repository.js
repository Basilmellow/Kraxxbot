"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationRepository = void 0;
const client_1 = require("../client");
class ModerationRepository {
    static async listByGuild(guildId, options) {
        return client_1.prisma.moderationCase.findMany({
            where: {
                guildId,
                ...(options?.targetId ? { targetId: options.targetId } : {}),
                ...(options?.action ? { action: options.action } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 50,
        });
    }
    static async findByCaseNumber(guildId, caseNumber) {
        return client_1.prisma.moderationCase.findUnique({
            where: {
                guildId_caseNumber: { guildId, caseNumber },
            },
        });
    }
}
exports.ModerationRepository = ModerationRepository;
