"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfRoleRepository = void 0;
const client_1 = require("../client");
const audit_event_1 = require("../../services/audit-event");
class SelfRoleRepository {
    static async createWithAudit(data) {
        return client_1.prisma.$transaction(async (transaction) => {
            const role = await transaction.guildSelfRole.create({ data: {
                    guildId: data.guildId, roleId: data.roleId, name: data.name, description: data.description,
                    emoji: data.emoji, category: data.category || 'GENERAL',
                } });
            await transaction.auditLog.create({ data: {
                    guildId: data.guildId, executorId: data.actorId, targetId: data.roleId, action: 'SELF_ROLE_CREATE',
                    details: (0, audit_event_1.createAuditDetails)({ source: 'BOT', targetType: 'ROLE', outcome: 'SUCCESS', metadata: { name: data.name } }),
                } });
            return role;
        });
    }
    static async deleteWithAudit(guildId, roleId, actorId) {
        return client_1.prisma.$transaction(async (transaction) => {
            const removed = await transaction.guildSelfRole.deleteMany({ where: { guildId, roleId } });
            if (!removed.count)
                return false;
            await transaction.auditLog.create({ data: {
                    guildId, executorId: actorId, targetId: roleId, action: 'SELF_ROLE_DELETE',
                    details: (0, audit_event_1.createAuditDetails)({ source: 'BOT', targetType: 'ROLE', outcome: 'SUCCESS' }),
                } });
            return true;
        });
    }
    static async create(data) {
        return client_1.prisma.guildSelfRole.create({
            data: {
                guildId: data.guildId,
                roleId: data.roleId,
                name: data.name,
                description: data.description,
                emoji: data.emoji,
                category: data.category || 'GENERAL',
            },
        });
    }
    static async listByGuild(guildId) {
        return client_1.prisma.guildSelfRole.findMany({
            where: { guildId },
            orderBy: { createdAt: 'asc' },
        });
    }
    static async findByRoleId(guildId, roleId) {
        return client_1.prisma.guildSelfRole.findUnique({
            where: {
                guildId_roleId: { guildId, roleId },
            },
        });
    }
    static async delete(guildId, roleId) {
        const res = await client_1.prisma.guildSelfRole.deleteMany({
            where: { guildId, roleId },
        });
        return res.count > 0;
    }
}
exports.SelfRoleRepository = SelfRoleRepository;
