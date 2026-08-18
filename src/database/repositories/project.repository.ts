import { prisma } from '../client';
import { Project } from '@prisma/client';

export class ProjectRepository {
  static async create(data: {
    code: string;
    name: string;
    description: string;
    clientName?: string;
    department?: string;
    leadId?: string;
    channelId?: string;
  }): Promise<Project> {
    return prisma.project.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        clientName: data.clientName,
        department: data.department || 'KRAXXSEC',
        leadId: data.leadId,
        channelId: data.channelId,
      },
    });
  }

  static async findByCode(code: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  static async listAll(): Promise<Project[]> {
    return prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
