import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { ReminderRepository } from '../database/repositories/reminder.repository';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class SchedulerService {
  private static isRunning = false;

  /**
   * Initializes cron jobs for background reminder dispatch and status checks.
   */
  static start(client: Client): void {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('⏰ Background Scheduler Service initialized');

    // Run every minute to check active due reminders
    cron.schedule('* * * * *', async () => {
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
        logger.error({ err: error }, 'Error in scheduler cron iteration');
      }
    });
  }
}
