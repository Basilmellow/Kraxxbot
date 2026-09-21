import { prisma } from '../client';
import { Event } from '@prisma/client';

export class EventRepository {
  static async create(data: {
    guildId: string;
    title: string;
    description: string;
    type?: string;
    department?: string;
    startTime: Date;
    endTime?: Date;
    location?: string;
    organizerId: string;
  }): Promise<Event> {
    return prisma.event.create({
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

  static async listUpcomingByGuild(guildId: string): Promise<Event[]> {
    return prisma.event.findMany({
      where: {
        guildId,
        status: 'UPCOMING',
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
