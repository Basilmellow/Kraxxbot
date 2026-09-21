import { prisma } from '../client';
import { AuditLog } from '@prisma/client';

export class AuditRepository {
  static async create(data: {
    guildId: string;
    action: string;
    executorId: string;
    targetId?: string;
    details?: string;
  }): Promise<AuditLog> {
    return prisma.auditLog.create({
      data: {
        guildId: data.guildId,
        action: data.action,
        executorId: data.executorId,
        targetId: data.targetId || null,
        details: data.details || null,
      },
    });
  }

  static async listRecent(guildId: string, limit = 50): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { guildId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
