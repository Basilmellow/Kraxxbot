import { prisma } from '../client';
import { AuditLog } from '@prisma/client';

export class AuditRepository {
  static async create(data: {
    action: string;
    executorId: string;
    targetId?: string;
    details?: string;
  }): Promise<AuditLog> {
    return prisma.auditLog.create({
      data,
    });
  }

  static async listRecent(limit = 50): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
