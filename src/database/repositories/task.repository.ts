import { prisma } from '../client';
import { Task } from '@prisma/client';

export class TaskRepository {
  static async create(data: {
    title: string;
    description: string;
    department?: string;
    priority?: string;
    creatorId: string;
    assigneeId?: string;
    dueDate?: Date;
  }): Promise<Task> {
    const taskCount = await prisma.task.count();
    return prisma.task.create({
      data: {
        taskNumber: taskCount + 1,
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

  static async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
    });
  }

  static async findByTaskNumber(taskNumber: number): Promise<Task | null> {
    return prisma.task.findFirst({
      where: { taskNumber },
    });
  }

  static async updateStatus(id: string, status: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });
  }

  static async listByDepartment(department?: string, status?: string): Promise<Task[]> {
    return prisma.task.findMany({
      where: {
        ...(department ? { department } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
