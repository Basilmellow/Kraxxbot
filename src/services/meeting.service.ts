import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { MeetingRepository } from '../database/repositories/meeting.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class MeetingService {
  static async scheduleMeeting(interaction: ChatInputCommandInteraction): Promise<void> {
    const organizer = interaction.member as GuildMember;
    const title = interaction.options.getString('title', true);
    const agenda = interaction.options.getString('agenda', true);
    const department = interaction.options.getString('department') || 'GENERAL';
    const minutesFromNow = interaction.options.getInteger('in_minutes', true);

    const startTime = new Date(Date.now() + minutesFromNow * 60 * 1000);

    try {
      const meeting = await MeetingRepository.create({
        title,
        agenda,
        department,
        startTime,
        organizerId: organizer.id,
        locationChannelId: interaction.channelId,
      });

      const embed = KraxxEmbedBuilder.meeting(
        meeting.title,
        meeting.agenda,
        meeting.department,
        `<t:${Math.floor(startTime.getTime() / 1000)}:F> (<t:${Math.floor(startTime.getTime() / 1000)}:R>)`,
        `<@${organizer.id}>`,
        `<#${interaction.channelId}>`
      );

      await interaction.reply({ embeds: [embed] });

      await AuditService.logEvent(
        interaction.guild,
        'MEETING_SCHEDULED',
        organizer.id,
        meeting.id,
        `Meeting: ${title} scheduled for ${startTime.toISOString()}`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to schedule meeting');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Meeting Error', 'Failed to schedule meeting.')],
        ephemeral: true,
      });
    }
  }

  static async listMeetings(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const upcoming = await MeetingRepository.listUpcoming();

      if (upcoming.length === 0) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.success('Meetings Schedule', 'No upcoming meetings currently scheduled.')],
          ephemeral: true,
        });
        return;
      }

      const embed = KraxxEmbedBuilder.createHeader('UPCOMING INTERNAL MEETINGS', 'HQ OPERATIONS');
      embed.setDescription(
        upcoming
          .map(
            m =>
              `• **${m.title}** (\`${m.department}\`)\n  <t:${Math.floor(m.startTime.getTime() / 1000)}:F> | Organizer: <@${m.organizerId}>\n  Agenda: ${m.agenda}`
          )
          .join('\n\n')
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Failed to list meetings');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Meeting Error', 'Failed to retrieve meetings.')],
        ephemeral: true,
      });
    }
  }
}
