"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerRepository = void 0;
const client_1 = require("../client");
const REMINDER_READY = (now) => ({
    OR: [
        { status: 'ACTIVE', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        { status: 'PROCESSING', leaseExpiresAt: { lte: now } },
    ],
});
const ANNOUNCEMENT_READY = (now) => ({
    OR: [
        { status: 'PENDING', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        { status: 'PROCESSING', leaseExpiresAt: { lte: now } },
    ],
});
class SchedulerRepository {
    static findDueReminders(now) {
        return client_1.prisma.reminder.findMany({
            where: { isRecurring: false, triggerAt: { lte: now }, ...REMINDER_READY(now) },
            orderBy: [{ triggerAt: 'asc' }, { createdAt: 'asc' }],
            take: 100,
        });
    }
    static claimReminder(reminder, now, leaseToken, leaseExpiresAt) {
        return client_1.prisma.reminder.updateMany({
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
    static completeReminder(id, guildId, leaseToken) {
        return client_1.prisma.reminder.updateMany({
            where: { id, guildId, status: 'PROCESSING', leaseToken },
            data: { status: 'COMPLETED', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: null },
        });
    }
    static failReminder(id, guildId, leaseToken, decision, lastError) {
        return client_1.prisma.reminder.updateMany({
            where: { id, guildId, status: 'PROCESSING', leaseToken },
            data: { ...decision, leaseToken: null, leaseExpiresAt: null, lastError },
        });
    }
    static failExpiredReminder(reminder, now) {
        return client_1.prisma.reminder.updateMany({
            where: {
                id: reminder.id, guildId: reminder.guildId, status: 'PROCESSING',
                leaseExpiresAt: { lte: now }, attempts: { gte: reminder.maxAttempts },
            },
            data: { status: 'FAILED', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: 'LeaseExpired' },
        });
    }
    static findDueAnnouncements(now) {
        return client_1.prisma.scheduledAnnouncement.findMany({
            where: { scheduledFor: { lte: now }, ...ANNOUNCEMENT_READY(now) },
            orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
            take: 100,
        });
    }
    static claimAnnouncement(announcement, now, leaseToken, leaseExpiresAt) {
        return client_1.prisma.scheduledAnnouncement.updateMany({
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
    static completeAnnouncement(id, guildId, leaseToken, messageId, sentAt, history) {
        return client_1.prisma.$transaction(async (transaction) => {
            const completed = await transaction.scheduledAnnouncement.updateMany({
                where: { id, guildId, status: 'PROCESSING', leaseToken },
                data: { status: 'SENT', messageId, sentAt, error: null, lastError: null, nextAttemptAt: null, leaseToken: null, leaseExpiresAt: null },
            });
            if (completed.count && history)
                await transaction.announcement.create({ data: { guildId, ...history, messageId } });
            return completed;
        });
    }
    static failAnnouncement(id, guildId, leaseToken, decision, lastError, safeMessage) {
        return client_1.prisma.scheduledAnnouncement.updateMany({
            where: { id, guildId, status: 'PROCESSING', leaseToken },
            data: { ...decision, leaseToken: null, leaseExpiresAt: null, lastError, error: safeMessage },
        });
    }
    static failExpiredAnnouncement(announcement, now) {
        return client_1.prisma.scheduledAnnouncement.updateMany({
            where: {
                id: announcement.id, guildId: announcement.guildId, status: 'PROCESSING',
                leaseExpiresAt: { lte: now }, attempts: { gte: announcement.maxAttempts },
            },
            data: { status: 'FAILED', leaseToken: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: 'LeaseExpired', error: 'Delivery stopped after repeated worker lease expiry.' },
        });
    }
}
exports.SchedulerRepository = SchedulerRepository;
