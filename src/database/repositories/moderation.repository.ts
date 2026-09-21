import { prisma } from '../client';
import { ModerationCase } from '@prisma/client';

export class ModerationRepository {
  static async getNextCaseNumber(guildId: string): Promise<number> {
    const highest = await prisma.moderationCase.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
      select: { caseNumber: true },
    });
    return (highest?.caseNumber || 0) + 1;
  }

  static async createCase(data: {
    guildId: string;
    targetId: string;
    targetTag?: string;
    moderatorId: string;
    moderatorTag?: string;
    action: string;
    reason?: string;
    durationSeconds?: number;
  }): Promise<ModerationCase> {
    const caseNumber = await this.getNextCaseNumber(data.guildId);

    return prisma.moderationCase.create({
      data: {
        caseNumber,
        guildId: data.guildId,
        targetId: data.targetId,
        targetTag: data.targetTag || null,
        moderatorId: data.moderatorId,
        moderatorTag: data.moderatorTag || null,
        action: data.action,
        reason: data.reason || null,
        durationSeconds: data.durationSeconds || null,
        active: true,
      },
    });
  }

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
