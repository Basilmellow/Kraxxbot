"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditRepository = void 0;
const client_1 = require("../client");
class AuditRepository {
    static async create(data) {
        return client_1.prisma.auditLog.create({
            data: {
                guildId: data.guildId,
                action: data.action,
                executorId: data.executorId,
                targetId: data.targetId || null,
                details: data.details || null,
            },
        });
    }
    static async listRecent(guildId, limit = 50) {
        return client_1.prisma.auditLog.findMany({
            where: { guildId },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }
}
exports.AuditRepository = AuditRepository;
