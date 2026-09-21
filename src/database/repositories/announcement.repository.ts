import { prisma } from '../client';
import { Announcement } from '@prisma/client';

export class AnnouncementRepository {
  static async create(data: {
    guildId: string;
    title: string;
    content: string;
    department?: string;
    type?: string;
    authorId: string;
    channelId: string;
    messageId?: string;
    mentionRole?: string;
    imageUrl?: string;
  }): Promise<Announcement> {
    return prisma.announcement.create({
      data: {
        guildId: data.guildId,
        title: data.title,
        content: data.content,
        department: data.department || 'GENERAL',
        type: data.type || 'GENERAL',
        authorId: data.authorId,
        channelId: data.channelId,
        messageId: data.messageId,
        mentionRole: data.mentionRole,
        imageUrl: data.imageUrl,
      },
    });
  }

  static async findRecentByGuild(guildId: string, limit = 10): Promise<Announcement[]> {
    return prisma.announcement.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
