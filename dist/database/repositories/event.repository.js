"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRepository = void 0;
const client_1 = require("../client");
class EventRepository {
    static async create(data) {
        return client_1.prisma.event.create({
            data: {
                guildId: data.guildId,
                title: data.title,
                description: data.description,
                type: data.type || 'COMMUNITY',
                department: data.department || 'GENERAL',
                startTime: data.startTime,
                endTime: data.endTime,
                location: data.location,
                organizerId: data.organizerId,
            },
        });
    }
    static async listUpcomingByGuild(guildId) {
        return client_1.prisma.event.findMany({
            where: {
                guildId,
                status: 'UPCOMING',
                startTime: { gte: new Date() },
            },
            orderBy: { startTime: 'asc' },
        });
    }
}
exports.EventRepository = EventRepository;
