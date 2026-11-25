"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const client_1 = require("../client");
class TaskRepository {
    static async getNextTaskNumber(guildId) {
        const highest = await client_1.prisma.task.findFirst({
            where: { guildId },
            orderBy: { taskNumber: 'desc' },
            select: { taskNumber: true },
        });
        return (highest?.taskNumber || 0) + 1;
    }
    static async create(data) {
        const taskNumber = await this.getNextTaskNumber(data.guildId);
        return client_1.prisma.task.create({
            data: {
                taskNumber,
                guildId: data.guildId,
                title: data.title,
                description: data.description,
                department: data.department || 'GENERAL',
                priority: data.priority || 'MEDIUM',
                creatorId: data.creatorId,
                assigneeId: data.assigneeId,
                dueDate: data.dueDate,
            },
        });
    }
    static async findById(id, guildId) {
        return client_1.prisma.task.findFirst({
            where: {
                id,
                ...(guildId ? { guildId } : {}),
            },
        });
    }
    static async findByTaskNumber(guildId, taskNumber) {
        return client_1.prisma.task.findUnique({
            where: {
                guildId_taskNumber: { guildId, taskNumber },
            },
        });
    }
    static async updateStatus(id, status, guildId) {
        const task = await client_1.prisma.task.findFirst({
            where: { id, ...(guildId ? { guildId } : {}) },
        });
        if (!task)
            throw new Error('Task not found');
        return client_1.prisma.task.update({
            where: { id },
            data: {
                status,
                completedAt: status === 'COMPLETED' ? new Date() : null,
            },
        });
    }
    static async listByGuild(guildId, filters) {
        return client_1.prisma.task.findMany({
            where: {
                guildId,
                ...(filters?.department ? { department: filters.department } : {}),
                ...(filters?.status ? { status: filters.status } : {}),
                ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.TaskRepository = TaskRepository;
