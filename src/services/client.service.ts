import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { ClientRepository } from '../database/repositories/client.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class ClientService {
  static async addClient(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const name = interaction.options.getString('name', true);
    const company = interaction.options.getString('company', true);
    const email = interaction.options.getString('email') || undefined;
    const division = interaction.options.getString('division') || 'KRAXXSEC';
    const notes = interaction.options.getString('notes') || undefined;

    try {
      const client = await ClientRepository.create({
        name,
        company,
        contactEmail: email,
        division,
        notes,
      });

      const embed = KraxxEmbedBuilder.createHeader('CLIENT PROFILE REGISTERED', division);
      embed.addFields(
        { name: 'Contact Name', value: client.name, inline: true },
        { name: 'Company', value: client.company, inline: true },
        { name: 'Division', value: `\`${client.division}\``, inline: true },
        { name: 'Contact Email', value: client.contactEmail || 'N/A', inline: true },
        { name: 'Status', value: `\`${client.status}\``, inline: true }
      );

      if (client.notes) {
        embed.addFields({ name: 'Notes', value: client.notes, inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

      await AuditService.logEvent(
        interaction.guild,
        'CLIENT_ADD',
        member.id,
        client.id,
        `Client profile registered: ${company} (${name})`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to add client');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Client Error', 'Failed to register client profile.')],
        ephemeral: true,
      });
    }
  }

  static async listClients(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const clients = await ClientRepository.listAll();

      if (clients.length === 0) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.success('Client Directory', 'No client records currently registered.')],
          ephemeral: true,
        });
        return;
      }

      const embed = KraxxEmbedBuilder.createHeader('KRAXX CLIENT DIRECTORY', 'CONFIDENTIAL');
      embed.setDescription(
        clients
          .map(
            c =>
              `• **${c.company}** (${c.name}) | Division: \`${c.division}\` | Status: \`${c.status}\``
          )
          .join('\n')
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to list clients');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Client Error', 'Failed to retrieve client directory.')],
        ephemeral: true,
      });
    }
  }
}
