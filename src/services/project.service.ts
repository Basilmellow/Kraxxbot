import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

// NOTE: Project management is not yet backed by a Prisma model.
// These handlers return a "not yet implemented" response.
export class ProjectService {
  static async createProject(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const code = interaction.options.getString('code', true).toUpperCase();
    const name = interaction.options.getString('name', true);

    logger.warn({ executor: member.id, code, name }, 'Project model not yet in schema — createProject is a no-op');

    await AuditService.logEvent(
      interaction.guild,
      'PROJECT_CREATE_ATTEMPT',
      member.id,
      interaction.guildId || 'unknown',
      `Attempted to create project: [${code}] ${name}`
    );

    await interaction.reply({
      embeds: [
        KraxxEmbedBuilder.error(
          'Feature Unavailable',
          'Project management is not yet available. This feature will be enabled in a future update.'
        ),
      ],
      ephemeral: true,
    });
  }

  static async listProjects(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [
        KraxxEmbedBuilder.error(
          'Feature Unavailable',
          'Project management is not yet available. This feature will be enabled in a future update.'
        ),
      ],
      ephemeral: true,
    });
  }
}
