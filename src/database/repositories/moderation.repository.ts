import { prisma } from '../client';
import { ModerationCase } from '@prisma/client';

export class ModerationRepository {
  static async listByGuild(
    guildId: string,
    options?: {
      targetId?: string;
      action?: string;
      limit?: number;
    }
  ): Promise<ModerationCase[]> {
    return prisma.moderationCase.findMany({
      where: {
        guildId,
        ...(options?.targetId ? { targetId: options.targetId } : {}),
        ...(options?.action ? { action: options.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  static async findByCaseNumber(guildId: string, caseNumber: number): Promise<ModerationCase | null> {
    return prisma.moderationCase.findUnique({
      where: {
        guildId_caseNumber: { guildId, caseNumber },
      },
    });
  }
}
