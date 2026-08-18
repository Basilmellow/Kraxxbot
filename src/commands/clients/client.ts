import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ClientService } from '../../services/client.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('client')
    .setDescription('Client relations & directory manager (Management Only)')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Register a client profile')
        .addStringOption(opt => opt.setName('name').setDescription('Primary contact name').setRequired(true))
        .addStringOption(opt => opt.setName('company').setDescription('Company or organization name').setRequired(true))
        .addStringOption(opt => opt.setName('email').setDescription('Contact email address').setRequired(false))
        .addStringOption(opt =>
          opt
            .setName('division')
            .setDescription('Servicing division')
            .setChoices(
              { name: 'KRAXXSEC', value: 'KRAXXSEC' },
              { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' },
              { name: 'Both', value: 'BOTH' }
            )
        )
        .addStringOption(opt => opt.setName('notes').setDescription('Account notes').setRequired(false))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List registered clients directory')),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as any;
    const auth = PermissionsService.requireManagement(member);

    if (!auth.authorized) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      await ClientService.addClient(interaction);
    } else if (subcommand === 'list') {
      await ClientService.listClients(interaction);
    }
  },
};
