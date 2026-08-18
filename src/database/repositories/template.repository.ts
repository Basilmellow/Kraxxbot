import { prisma } from '../client';
import { Template } from '@prisma/client';

export class TemplateRepository {
  static async create(data: {
    name: string;
    category: string;
    title: string;
    content: string;
    variables?: string[];
    createdBy: string;
  }): Promise<Template> {
    return prisma.template.create({
      data: {
        name: data.name.toLowerCase(),
        category: data.category,
        title: data.title,
        content: data.content,
        variables: data.variables ? JSON.stringify(data.variables) : null,
        createdBy: data.createdBy,
      },
    });
  }

  static async findByName(name: string): Promise<Template | null> {
    return prisma.template.findUnique({
      where: { name: name.toLowerCase() },
    });
  }

  static async listAll(): Promise<Template[]> {
    return prisma.template.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
