import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { ReminderRepository } from '../database/repositories/reminder.repository';
import { prisma } from '../database/client';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class SchedulerService {
  private static isRunning = false;

  /**
   * Initializes cron jobs for background reminder dispatch, scheduled announcements, and status checks.
   */
  static start(client: Client): void {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('⏰ Background Scheduler Service initialized');

    // Run every minute to check active due reminders & scheduled announcements
    cron.schedule('* * * * *', async () => {
      // 1. Process Due Reminders
      try {
        const dueReminders = await ReminderRepository.findActiveDue();
        for (const reminder of dueReminders) {
          try {
            if (reminder.targetType === 'USER') {
              const user = await client.users.fetch(reminder.targetId).catch(() => null);
              if (user) {
                const embed = KraxxEmbedBuilder.createHeader(`REMINDER: ${reminder.title}`, 'SCHEDULED ALERT');
                embed.setDescription(reminder.message);
                await user.send({ embeds: [embed] }).catch(() => {});
              }
            } else if (reminder.targetType === 'CHANNEL') {
              const channel = await client.channels.fetch(reminder.targetId).catch(() => null) as TextChannel | null;
              if (channel && channel.isTextBased()) {
                const embed = KraxxEmbedBuilder.createHeader(`REMINDER: ${reminder.title}`, 'SCHEDULED ALERT');
                embed.setDescription(reminder.message);
                await channel.send({ embeds: [embed] }).catch(() => {});
              }
            }

            await ReminderRepository.markCompleted(reminder.id);
            logger.info({ reminderId: reminder.id }, 'Dispatched scheduled reminder');
          } catch (err) {
            logger.error({ err, reminderId: reminder.id }, 'Failed to dispatch individual reminder');
          }
        }
      } catch (error) {
        logger.error({ err: error }, 'Error in scheduler reminders iteration');
      }

      // 2. Process Due Scheduled Announcements
      try {
        const dueAnnouncements = await prisma.scheduledAnnouncement.findMany({
          where: {
            status: 'PENDING',
            scheduledFor: {
              lte: new Date(),
            },
          },
          take: 10,
        });

        for (const sa of dueAnnouncements) {
          try {
            // Lock announcement to prevent concurrent dispatch
            await prisma.scheduledAnnouncement.update({
              where: { id: sa.id },
              data: { status: 'PROCESSING' },
            });

            const channel = await client.channels.fetch(sa.channelId).catch(() => null) as TextChannel | null;
            if (!channel || !channel.isTextBased()) {
              await prisma.scheduledAnnouncement.update({
                where: { id: sa.id },
                data: {
                  status: 'FAILED',
                  error: `Channel ${sa.channelId} not found or not text-based`,
                },
              });
              continue;
            }

            let contentPayload = sa.content || undefined;
            if (sa.mentionType === 'EVERYONE') {
              contentPayload = contentPayload ? `@everyone\n${contentPayload}` : '@everyone';
            } else if (sa.mentionType === 'HERE') {
              contentPayload = contentPayload ? `@here\n${contentPayload}` : '@here';
            } else if (sa.mentionType === 'ROLE' && sa.mentionRoleId) {
              const mention = `<@&${sa.mentionRoleId}>`;
              contentPayload = contentPayload ? `${mention}\n${contentPayload}` : mention;
            }

            let parsedEmbeds: any[] = [];
            if (sa.embedPayload) {
              try {
                parsedEmbeds = JSON.parse(sa.embedPayload);
              } catch (e) {
                logger.warn({ err: e, announcementId: sa.id }, 'Failed to parse embedPayload JSON in scheduler');
              }
            }

            const sentMessage = await channel.send({
              content: contentPayload,
              embeds: parsedEmbeds,
            });

            await prisma.scheduledAnnouncement.update({
              where: { id: sa.id },
              data: {
                status: 'SENT',
                sentAt: new Date(),
                messageId: sentMessage.id,
              },
            });

            // Mirror into general Announcement record for history
            if (sa.title || sa.content) {
              await prisma.announcement.create({
                data: {
                  title: sa.title || 'Scheduled Announcement',
                  content: sa.content || (parsedEmbeds[0]?.description) || 'Announcement',
                  department: sa.department,
                  type: 'SCHEDULED',
                  authorId: sa.createdBy,
                  channelId: sa.channelId,
                  messageId: sentMessage.id,
                  mentionRole: sa.mentionRoleId,
                },
              }).catch(() => {});
            }

            if (channel.guild) {
              await AuditService.logEvent(
                channel.guild,
                'SCHEDULED_ANNOUNCEMENT_DISPATCHED',
                sa.createdBy,
                channel.id,
                `Dispatched scheduled announcement: "${sa.title || 'Announcement'}" to <#${channel.id}>`
              );
            }

            logger.info({ announcementId: sa.id, channelId: sa.channelId }, 'Dispatched scheduled announcement from scheduler');
          } catch (dispatchErr) {
            logger.error({ err: dispatchErr, announcementId: sa.id }, 'Failed to dispatch scheduled announcement');
            await prisma.scheduledAnnouncement.update({
              where: { id: sa.id },
              data: {
                status: 'FAILED',
                error: String(dispatchErr),
              },
            }).catch(() => {});
          }
        }
      } catch (announcementError) {
        logger.error({ err: announcementError }, 'Error in scheduler announcements iteration');
      }
    });
  }
}
