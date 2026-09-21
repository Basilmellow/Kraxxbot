import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

// NOTE: Client management is not yet backed by a Prisma model.
// These handlers return a "not yet implemented" response.
export class ClientService {
  static async addClient(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const name = interaction.options.getString('name', true);
    const company = interaction.options.getString('company', true);
    const division = interaction.options.getString('division') || 'GENERAL';

    logger.warn({ executor: member.id, name, company, division }, 'Client model not yet in schema — addClient is a no-op');

    await AuditService.logEvent(
      interaction.guild,
      'CLIENT_ADD_ATTEMPT',
      member.id,
      interaction.guildId || 'unknown',
      `Attempted to add client: ${company} (${name})`
    );

    await interaction.reply({
      embeds: [
        KraxxEmbedBuilder.error(
          'Feature Unavailable',
          'Client management is not yet available. This feature will be enabled in a future update.'
        ),
      ],
      ephemeral: true,
    });
  }

  static async listClients(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        KraxxEmbedBuilder.error(
          'Feature Unavailable',
          'Client management is not yet available. This feature will be enabled in a future update.'
        ),
      ],
      ephemeral: true,
    });
  }
}
