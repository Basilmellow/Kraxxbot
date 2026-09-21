import { prisma } from '../client';
import { Task } from '@prisma/client';

export class TaskRepository {
  static async getNextTaskNumber(guildId: string): Promise<number> {
    const highest = await prisma.task.findFirst({
      where: { guildId },
      orderBy: { taskNumber: 'desc' },
      select: { taskNumber: true },
    });
    return (highest?.taskNumber || 0) + 1;
  }

  static async create(data: {
    guildId: string;
    title: string;
    description: string;
    department?: string;
    priority?: string;
    creatorId: string;
    assigneeId?: string;
    dueDate?: Date;
  }): Promise<Task> {
    const taskNumber = await this.getNextTaskNumber(data.guildId);

    return prisma.task.create({
      data: {
        taskNumber,
        guildId: data.guildId,
        title: data.title,
        description: data.description,
        department: data.department || 'GENERAL',
        priority: data.priority || 'MEDIUM',
        creatorId: data.creatorId,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
      },
    });
  }

  static async findById(id: string, guildId?: string): Promise<Task | null> {
    return prisma.task.findFirst({
      where: {
        id,
        ...(guildId ? { guildId } : {}),
      },
    });
  }

  static async findByTaskNumber(guildId: string, taskNumber: number): Promise<Task | null> {
    return prisma.task.findUnique({
      where: {
        guildId_taskNumber: { guildId, taskNumber },
      },
    });
  }

  static async updateStatus(id: string, status: string, guildId?: string): Promise<Task> {
    const task = await prisma.task.findFirst({
      where: { id, ...(guildId ? { guildId } : {}) },
    });
    if (!task) throw new Error('Task not found');

    return prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });
  }

  static async listByGuild(
    guildId: string,
    filters?: {
      department?: string;
      status?: string;
      assigneeId?: string;
    }
  ): Promise<Task[]> {
    return prisma.task.findMany({
      where: {
        guildId,
        ...(filters?.department ? { department: filters.department } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
