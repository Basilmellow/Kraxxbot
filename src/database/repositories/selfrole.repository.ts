import { prisma } from '../client';
import { GuildSelfRole } from '@prisma/client';

export class SelfRoleRepository {
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
