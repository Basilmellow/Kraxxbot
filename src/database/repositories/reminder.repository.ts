import { prisma } from '../client';
import { Reminder } from '@prisma/client';

export class ReminderRepository {
  static async create(data: {
    guildId: string;
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
      data: {
        guildId: data.guildId,
        title: data.title,
        message: data.message,
        targetType: data.targetType,
        targetId: data.targetId,
        cronPattern: data.cronPattern,
        triggerAt: data.triggerAt,
        isRecurring: data.isRecurring || false,
        createdBy: data.createdBy,
      },
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

  static async listByGuildAndUser(guildId: string, createdBy: string): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: { guildId, createdBy, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async listByGuild(guildId: string): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
