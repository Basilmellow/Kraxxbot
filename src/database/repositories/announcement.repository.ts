import { prisma } from '../client';
import { Announcement } from '@prisma/client';
import { createHash } from 'node:crypto';
import { createAuditDetails } from '../../services/audit-event';

export class AnnouncementRepository {
  static async enqueueDelivery(data: {
    guildId: string; interactionId: string; title: string; content: string; department: string; type: string;
    authorId: string; channelId: string; mentionType: 'NONE' | 'EVERYONE' | 'HERE' | 'ROLE'; mentionRoleId?: string | null;
    embedPayload?: string | null;
  }) {
    const idempotencyKey = createHash('sha256').update(`bot-announcement:${data.guildId}:${data.interactionId}`).digest('hex');
    try {
      return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.scheduledAnnouncement.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
      const scheduled = await transaction.scheduledAnnouncement.create({ data: {
        guildId: data.guildId, channelId: data.channelId, title: data.title, content: data.content,
        department: data.department, announcementType: data.type, mentionType: data.mentionType,
        mentionRoleId: data.mentionRoleId || null, embedPayload: data.embedPayload || null,
        scheduledFor: new Date(), createdBy: data.authorId, idempotencyKey,
      } });
      await transaction.auditLog.create({ data: {
        guildId: data.guildId, executorId: data.authorId, targetId: scheduled.id, action: 'ANNOUNCEMENT_ENQUEUE',
        details: createAuditDetails({ source: 'BOT', targetType: 'SCHEDULED_ANNOUNCEMENT', outcome: 'SUCCESS',
          metadata: { channelId: data.channelId, title: data.title, idempotencyKey } }),
      } });
      return scheduled;
      });
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002') throw error;
      const existing = await prisma.scheduledAnnouncement.findUnique({ where: { idempotencyKey } });
      if (!existing || existing.guildId !== data.guildId || existing.createdBy !== data.authorId) throw error;
      return existing;
    }
  }

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
