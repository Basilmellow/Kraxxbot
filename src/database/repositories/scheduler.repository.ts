import { prisma } from '../client';
import type { Reminder, ScheduledAnnouncement } from '@prisma/client';

const REMINDER_READY = (now: Date) => ({
  OR: [
    { status: 'ACTIVE', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
    { status: 'PROCESSING', leaseExpiresAt: { lte: now } },
  ],
});

const ANNOUNCEMENT_READY = (now: Date) => ({
  OR: [
    { status: 'PENDING', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
    { status: 'PROCESSING', leaseExpiresAt: { lte: now } },
  ],
});

export class SchedulerRepository {
  static findDueReminders(now: Date): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: { isRecurring: false, triggerAt: { lte: now }, ...REMINDER_READY(now) },
      orderBy: [{ triggerAt: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });
  }

  static claimReminder(reminder: Reminder, now: Date, leaseToken: string, leaseExpiresAt: Date) {
    return prisma.reminder.updateMany({
      where: {
        id: reminder.id,
        guildId: reminder.guildId,
        isRecurring: false,
        triggerAt: { lte: now },
        OR: [
          {
            status: 'ACTIVE', attempts: { lt: reminder.maxAttempts },
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          { status: 'PROCESSING', leaseExpiresAt: { lte: now }, attempts: { lt: reminder.maxAttempts } },
        ],
      },
      data: { status: 'PROCESSING', leaseToken, leaseExpiresAt, attempts: { increment: 1 } },
    });
  }

  static completeReminder(id: string, guildId: string, leaseToken: string) {
    return prisma.reminder.updateMany({
      where: { id, guildId, status: 'PROCESSING', leaseToken },
      data: { status: 'COMPLETED', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: null },
    });
  }

  static failReminder(
    id: string,
    guildId: string,
    leaseToken: string,
    decision: { status: string; nextAttemptAt: Date | null },
    lastError: string,
  ) {
    return prisma.reminder.updateMany({
      where: { id, guildId, status: 'PROCESSING', leaseToken },
      data: { ...decision, leaseToken: null, leaseExpiresAt: null, lastError },
    });
  }

  static failExpiredReminder(reminder: Reminder, now: Date) {
    return prisma.reminder.updateMany({
      where: {
        id: reminder.id, guildId: reminder.guildId, status: 'PROCESSING',
        leaseExpiresAt: { lte: now }, attempts: { gte: reminder.maxAttempts },
      },
      data: { status: 'FAILED', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: 'LeaseExpired' },
    });
  }

  static findDueAnnouncements(now: Date): Promise<ScheduledAnnouncement[]> {
    return prisma.scheduledAnnouncement.findMany({
      where: { scheduledFor: { lte: now }, ...ANNOUNCEMENT_READY(now) },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });
  }

  static claimAnnouncement(announcement: ScheduledAnnouncement, now: Date, leaseToken: string, leaseExpiresAt: Date) {
    return prisma.scheduledAnnouncement.updateMany({
      where: {
        id: announcement.id,
        guildId: announcement.guildId,
        scheduledFor: { lte: now },
        OR: [
          {
            status: 'PENDING', attempts: { lt: announcement.maxAttempts },
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          { status: 'PROCESSING', leaseExpiresAt: { lte: now }, attempts: { lt: announcement.maxAttempts } },
        ],
      },
      data: { status: 'PROCESSING', leaseToken, leaseExpiresAt, attempts: { increment: 1 } },
    });
  }

  static completeAnnouncement(
    id: string, guildId: string, leaseToken: string, messageId: string, sentAt: Date,
    history?: { title: string; content: string; department: string; type: string; authorId: string; channelId: string; mentionRole: string | null },
  ) {
    return prisma.$transaction(async (transaction) => {
      const completed = await transaction.scheduledAnnouncement.updateMany({
        where: { id, guildId, status: 'PROCESSING', leaseToken },
        data: { status: 'SENT', messageId, sentAt, error: null, lastError: null, nextAttemptAt: null, leaseToken: null, leaseExpiresAt: null },
      });
      if (completed.count && history) await transaction.announcement.create({ data: { guildId, ...history, messageId } });
      return completed;
    });
  }

  static failAnnouncement(
    id: string,
    guildId: string,
    leaseToken: string,
    decision: { status: string; nextAttemptAt: Date | null },
    lastError: string,
    safeMessage: string,
  ) {
    return prisma.scheduledAnnouncement.updateMany({
      where: { id, guildId, status: 'PROCESSING', leaseToken },
      data: { ...decision, leaseToken: null, leaseExpiresAt: null, lastError, error: safeMessage },
    });
  }

  static failExpiredAnnouncement(announcement: ScheduledAnnouncement, now: Date) {
    return prisma.scheduledAnnouncement.updateMany({
      where: {
        id: announcement.id, guildId: announcement.guildId, status: 'PROCESSING',
        leaseExpiresAt: { lte: now }, attempts: { gte: announcement.maxAttempts },
      },
      data: { status: 'FAILED', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: 'LeaseExpired', error: 'Delivery stopped after repeated worker lease expiry.' },
    });
  }
}
