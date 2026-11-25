"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingRepository = void 0;
const client_1 = require("../client");
class MeetingRepository {
    static async create(data) {
        return client_1.prisma.meeting.create({
            data: {
                guildId: data.guildId,
                title: data.title,
                agenda: data.agenda,
                department: data.department || 'GENERAL',
                startTime: data.startTime,
                endTime: data.endTime,
                locationChannelId: data.locationChannelId,
                organizerId: data.organizerId,
                attendees: data.attendees ? JSON.stringify(data.attendees) : null,
            },
        });
    }
    static async listUpcomingByGuild(guildId) {
        return client_1.prisma.meeting.findMany({
            where: {
                guildId,
                status: 'SCHEDULED',
                startTime: { gte: new Date() },
            },
            orderBy: { startTime: 'asc' },
        });
    }
}
exports.MeetingRepository = MeetingRepository;
