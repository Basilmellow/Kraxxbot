import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TemplateService } from '../../services/template.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('template')
    .setDescription('Operational document & message templates')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Save a new operational template')
        .addStringOption(opt => opt.setName('name').setDescription('Unique template identifier key').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('category')
            .setDescription('Template category')
            .setRequired(true)
            .setChoices(
              { name: 'Announcement', value: 'ANNOUNCEMENT' },
              { name: 'Security Report', value: 'SECURITY_REPORT' },
              { name: 'Studio Brief', value: 'STUDIO_BRIEF' },
              { name: 'Meeting Agenda', value: 'MEETING_AGENDA' }
            )
        )
        .addStringOption(opt => opt.setName('title').setDescription('Template header title').setRequired(true))
        .addStringOption(opt => opt.setName('content').setDescription('Template markdown body content').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List registered operational templates'))
    .addSubcommand(sub =>
      sub
        .setName('use')
        .setDescription('Render and display a saved template')
        .addStringOption(opt => opt.setName('name').setDescription('Template key name').setRequired(true))
    ),

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
      await TemplateService.createTemplate(interaction);
    } else if (subcommand === 'list') {
      await TemplateService.listTemplates(interaction);
    } else if (subcommand === 'use') {
      await TemplateService.useTemplate(interaction);
    }
  },
};
