import { prisma } from '../client';
import { Announcement } from '@prisma/client';

export class AnnouncementRepository {
  static async create(data: {
    title: string;
    content: string;
    department: string;
    type: string;
    authorId: string;
    channelId: string;
    messageId?: string;
    mentionRole?: string;
    imageUrl?: string;
  }): Promise<Announcement> {
    return prisma.announcement.create({
      data,
    });
  }

  static async findRecent(limit = 10): Promise<Announcement[]> {
    return prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
