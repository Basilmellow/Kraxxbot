import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ProjectService } from '../../services/project.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('project')
    .setDescription('Division project management directory')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Register a new project')
        .addStringOption(opt => opt.setName('code').setDescription('Unique project code (e.g. SEC-01)').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Project title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Project summary').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('department')
            .setDescription('Responsible division')
            .setChoices(
              { name: 'KRAXXSEC', value: 'KRAXXSEC' },
              { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }
            )
        )
        .addStringOption(opt => opt.setName('client').setDescription('Client company name').setRequired(false))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List active organization projects')),

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
      await ProjectService.createProject(interaction);
    } else if (subcommand === 'list') {
      await ProjectService.listProjects(interaction);
    }
  },
};
