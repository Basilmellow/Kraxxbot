import { prisma } from '../client';
import { GuildSelfRole } from '@prisma/client';
import { createAuditDetails } from '../../services/audit-event';

export class SelfRoleRepository {
  static async createWithAudit(data: {
    guildId: string; roleId: string; name: string; actorId: string; description?: string; emoji?: string; category?: string;
  }): Promise<GuildSelfRole> {
    return prisma.$transaction(async (transaction) => {
      const role = await transaction.guildSelfRole.create({ data: {
        guildId: data.guildId, roleId: data.roleId, name: data.name, description: data.description,
        emoji: data.emoji, category: data.category || 'GENERAL',
      } });
      await transaction.auditLog.create({ data: {
        guildId: data.guildId, executorId: data.actorId, targetId: data.roleId, action: 'SELF_ROLE_CREATE',
        details: createAuditDetails({ source: 'BOT', targetType: 'ROLE', outcome: 'SUCCESS', metadata: { name: data.name } }),
      } });
      return role;
    });
  }

  static async deleteWithAudit(guildId: string, roleId: string, actorId: string): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const removed = await transaction.guildSelfRole.deleteMany({ where: { guildId, roleId } });
      if (!removed.count) return false;
      await transaction.auditLog.create({ data: {
        guildId, executorId: actorId, targetId: roleId, action: 'SELF_ROLE_DELETE',
        details: createAuditDetails({ source: 'BOT', targetType: 'ROLE', outcome: 'SUCCESS' }),
      } });
      return true;
    });
  }

  static async create(data: {
    guildId: string;
    roleId: string;
    name: string;
    description?: string;
    emoji?: string;
    category?: string;
  }): Promise<GuildSelfRole> {
    return prisma.guildSelfRole.create({
      data: {
        guildId: data.guildId,
        roleId: data.roleId,
        name: data.name,
        description: data.description,
        emoji: data.emoji,
        category: data.category || 'GENERAL',
      },
    });
  }

  static async listByGuild(guildId: string): Promise<GuildSelfRole[]> {
    return prisma.guildSelfRole.findMany({
      where: { guildId },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async findByRoleId(guildId: string, roleId: string): Promise<GuildSelfRole | null> {
    return prisma.guildSelfRole.findUnique({
      where: {
        guildId_roleId: { guildId, roleId },
      },
    });
  }

  static async delete(guildId: string, roleId: string): Promise<boolean> {
    const res = await prisma.guildSelfRole.deleteMany({
      where: { guildId, roleId },
    });
    return res.count > 0;
  }
}
