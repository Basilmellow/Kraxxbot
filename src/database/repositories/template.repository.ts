import { prisma } from '../client';
import { EmbedTemplate } from '@prisma/client';

// Maps to EmbedTemplate in schema.prisma
// EmbedTemplate uses 'embedData' (JSON) not 'content'
export class TemplateRepository {
  static async create(data: {
    guildId: string;
    name: string;
    category: string;
    title?: string;
    description?: string;
    embedData: string; // JSON string
    createdBy: string;
  }): Promise<EmbedTemplate> {
    return prisma.embedTemplate.create({
      data: {
        guildId: data.guildId,
        name: data.name.toLowerCase(),
        category: data.category,
        title: data.title,
        description: data.description,
        embedData: data.embedData,
        createdBy: data.createdBy,
      },
    });
  }

  static async findByName(guildId: string, name: string): Promise<EmbedTemplate | null> {
    return prisma.embedTemplate.findFirst({
      where: { guildId, name: name.toLowerCase() },
    });
  }

  static async listByGuild(guildId: string): Promise<EmbedTemplate[]> {
    return prisma.embedTemplate.findMany({
      where: { guildId },
      orderBy: { name: 'asc' },
    });
  }

  static async delete(guildId: string, name: string): Promise<boolean> {
    const res = await prisma.embedTemplate.deleteMany({
      where: { guildId, name: name.toLowerCase() },
    });
    return res.count > 0;
  }
}
