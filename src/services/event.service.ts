import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { EventRepository } from '../database/repositories/event.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class EventService {
  static async createEvent(interaction: ChatInputCommandInteraction): Promise<void> {
    const organizer = interaction.member as GuildMember;
    const guildId = interaction.guildId!;
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const type = interaction.options.getString('type') || 'INTERNAL';
    const department = interaction.options.getString('department') || 'GENERAL';
    const hoursFromNow = interaction.options.getInteger('in_hours', true);

    const startTime = new Date(Date.now() + hoursFromNow * 3600 * 1000);

    try {
      const event = await EventRepository.create({
        guildId,
        title,
        description,
        type,
        department,
        startTime,
        organizerId: organizer.id,
      });

      const embed = KraxxEmbedBuilder.event(
        event.title,
        event.description,
        event.type,
        event.department,
        `<t:${Math.floor(startTime.getTime() / 1000)}:F> (<t:${Math.floor(startTime.getTime() / 1000)}:R>)`,
        'Event'
      );

      await interaction.reply({ embeds: [embed] });

      await AuditService.logEvent(
        interaction.guild,
        'EVENT_CREATE',
        organizer.id,
        event.id,
        `Event created: ${title} (${type})`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to create event');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Event Error', 'Failed to schedule event.')],
        ephemeral: true,
      });
    }
  }

  static async listEvents(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;

    try {
      const events = await EventRepository.listUpcomingByGuild(guildId);

      if (events.length === 0) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.success('Events Calendar', 'No upcoming events scheduled.')],
          ephemeral: true,
        });
        return;
      }

      const embed = KraxxEmbedBuilder.createHeader('UPCOMING EVENTS', 'CALENDAR');
      embed.setDescription(
        events
          .map(
            (e) =>
              `• **${e.title}** [\`${e.type}\` / \`${e.department}\`]\n  Starts: <t:${Math.floor(e.startTime.getTime() / 1000)}:F>\n  ${e.description}`
          )
          .join('\n\n')
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Failed to list events');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Event Error', 'Failed to retrieve events.')],
        ephemeral: true,
      });
    }
  }
}
