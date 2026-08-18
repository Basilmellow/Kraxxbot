import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EventService } from '../../services/event.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Organizational event management')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Schedule an event')
        .addStringOption(opt => opt.setName('title').setDescription('Event title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Event description').setRequired(true))
        .addIntegerOption(opt => opt.setName('in_hours').setDescription('Hours from now when event begins').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('department')
            .setDescription('Division target')
            .setChoices(
              { name: 'General HQ', value: 'GENERAL' },
              { name: 'KRAXXSEC', value: 'KRAXXSEC' },
              { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Event type')
            .setChoices(
              { name: 'Internal', value: 'INTERNAL' },
              { name: 'Public Workshop', value: 'PUBLIC' },
              { name: 'Security CTF', value: 'SECURITY_CTF' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List upcoming organizational events')),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const member = interaction.member as any;
      const auth = PermissionsService.requireTeamLead(member);
      if (!auth.authorized) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
          ephemeral: true,
        });
        return;
      }
      await EventService.createEvent(interaction);
    } else if (subcommand === 'list') {
      await EventService.listEvents(interaction);
    }
  },
};
