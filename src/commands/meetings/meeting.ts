import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { MeetingService } from '../../services/meeting.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('meeting')
    .setDescription('Schedule and manage internal meetings')
    .addSubcommand(sub =>
      sub
        .setName('schedule')
        .setDescription('Schedule a new internal meeting')
        .addStringOption(opt => opt.setName('title').setDescription('Meeting title').setRequired(true))
        .addStringOption(opt => opt.setName('agenda').setDescription('Meeting agenda details').setRequired(true))
        .addIntegerOption(opt => opt.setName('in_minutes').setDescription('Minutes from now when meeting starts').setRequired(true))
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
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List upcoming scheduled meetings')),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'schedule') {
      const member = interaction.member as any;
      const auth = PermissionsService.requireTeamLead(member);
      if (!auth.authorized) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
          ephemeral: true,
        });
        return;
      }
      await MeetingService.scheduleMeeting(interaction);
    } else if (subcommand === 'list') {
      await MeetingService.listMeetings(interaction);
    }
  },
};
