import { prisma } from '../client';
import { Meeting } from '@prisma/client';

export class MeetingRepository {
  static async create(data: {
    guildId: string;
    title: string;
    agenda: string;
    department?: string;
    startTime: Date;
    endTime?: Date;
    locationChannelId?: string;
    organizerId: string;
    attendees?: string[];
  }): Promise<Meeting> {
    return prisma.meeting.create({
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

  static async listUpcomingByGuild(guildId: string): Promise<Meeting[]> {
    return prisma.meeting.findMany({
      where: {
        guildId,
        status: 'SCHEDULED',
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
