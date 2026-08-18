import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { ReminderRepository } from '../database/repositories/reminder.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class ReminderService {
  static async setReminder(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const title = interaction.options.getString('title', true);
    const message = interaction.options.getString('message', true);
    const minutes = interaction.options.getInteger('minutes', true);

    const triggerAt = new Date(Date.now() + minutes * 60 * 1000);

    try {
      const reminder = await ReminderRepository.create({
        title,
        message,
        targetType: 'USER',
        targetId: member.id,
        triggerAt,
        createdBy: member.id,
      });

      const embed = KraxxEmbedBuilder.success(
        'Reminder Scheduled',
        `Reminder **"${title}"** scheduled for <t:${Math.floor(triggerAt.getTime() / 1000)}:R>.`
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });

      await AuditService.logEvent(
        interaction.guild,
        'REMINDER_SET',
        member.id,
        reminder.id,
        `Reminder "${title}" set for ${minutes} mins`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to set reminder');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Reminder Error', 'Failed to schedule reminder.')],
        ephemeral: true,
      });
    }
  }

  static async listReminders(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;

    try {
      const reminders = await ReminderRepository.listByUser(member.id);

      if (reminders.length === 0) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.success('Reminders', 'You have no active pending reminders.')],
          ephemeral: true,
        });
        return;
      }

      const embed = KraxxEmbedBuilder.createHeader('ACTIVE REMINDERS', 'PERSONAL');
      embed.setDescription(
        reminders
          .map(
            r =>
              `• **${r.title}**: ${r.message} (<t:${Math.floor((r.triggerAt?.getTime() || 0) / 1000)}:R>)`
          )
          .join('\n')
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to list reminders');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Reminder Error', 'Failed to retrieve reminders.')],
        ephemeral: true,
      });
    }
  }
}
