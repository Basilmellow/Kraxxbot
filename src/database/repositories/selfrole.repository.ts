import { prisma } from '../client';
import { SelfRole } from '@prisma/client';

export class SelfRoleRepository {
  static async create(data: {
    roleId: string;
    name: string;
    description?: string;
    emoji?: string;
    category?: string;
  }): Promise<SelfRole> {
    return prisma.selfRole.create({
      data: {
        roleId: data.roleId,
        name: data.name,
        description: data.description || null,
        emoji: data.emoji || null,
        category: data.category || 'GENERAL',
      },
    });
  }

  static async findByRoleId(roleId: string): Promise<SelfRole | null> {
    return prisma.selfRole.findUnique({
      where: { roleId },
    });
  }

  static async findAll(): Promise<SelfRole[]> {
    return prisma.selfRole.findMany({
      orderBy: { name: 'asc' },
    });
  }

  static async deleteByRoleId(roleId: string): Promise<boolean> {
    const res = await prisma.selfRole.deleteMany({
      where: { roleId },
    });
    return res.count > 0;
  }
}
