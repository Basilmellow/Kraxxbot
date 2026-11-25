"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderRepository = void 0;
const client_1 = require("../client");
class ReminderRepository {
    static async create(data) {
        return client_1.prisma.reminder.create({
            data: {
                guildId: data.guildId,
                title: data.title,
                message: data.message,
                targetType: data.targetType,
                targetId: data.targetId,
                cronPattern: data.cronPattern,
                triggerAt: data.triggerAt,
                isRecurring: data.isRecurring || false,
                createdBy: data.createdBy,
            },
        });
    }
    static async findActiveDue(now = new Date()) {
        return client_1.prisma.reminder.findMany({
            take: 100,
            where: {
                status: 'ACTIVE',
                isRecurring: false,
                triggerAt: {
                    lte: now,
                },
            },
        });
    }
    static async markCompleted(id, guildId) {
        return client_1.prisma.reminder.update({
            where: { id, guildId },
            data: { status: 'COMPLETED' },
        });
    }
    static async listByGuildAndUser(guildId, createdBy) {
        return client_1.prisma.reminder.findMany({
            where: { guildId, createdBy, status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async listByGuild(guildId) {
        return client_1.prisma.reminder.findMany({
            where: { guildId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.ReminderRepository = ReminderRepository;
