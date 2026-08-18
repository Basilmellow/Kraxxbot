import { prisma } from '../client';
import { Reminder } from '@prisma/client';

export class ReminderRepository {
  static async create(data: {
    title: string;
    message: string;
    targetType: string;
    targetId: string;
    cronPattern?: string;
    triggerAt?: Date;
    isRecurring?: boolean;
    createdBy: string;
  }): Promise<Reminder> {
    return prisma.reminder.create({
      data,
    });
  }

  static async findActiveDue(now: Date = new Date()): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: {
        status: 'ACTIVE',
        isRecurring: false,
        triggerAt: {
          lte: now,
        },
      },
    });
  }

  static async markCompleted(id: string): Promise<Reminder> {
    return prisma.reminder.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  static async listByUser(createdBy: string): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: { createdBy, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
