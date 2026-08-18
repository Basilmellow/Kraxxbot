import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, TextChannel, Role } from 'discord.js';
import { SelfRoleService } from '../../services/selfrole.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('selfrole')
    .setDescription('Self-assignable roles management and interaction system')

    // /selfrole list
    .addSubcommand(sub => sub.setName('list').setDescription('Display all self-assignable roles in KRAXX HQ'))

    // /selfrole create
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Register a role as a self-assignable role (Management Only)')
        .addRoleOption(opt => opt.setName('role').setDescription('Target Discord role').setRequired(true))
        .addStringOption(opt => opt.setName('display_name').setDescription('Display name for the role').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji prefix (e.g. 🎨)').setRequired(false))
        .addStringOption(opt => opt.setName('description').setDescription('Brief role description').setRequired(false))
    )

    // /selfrole delete
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Unregister a self-assignable role (Management Only)')
        .addRoleOption(opt => opt.setName('role').setDescription('Target Discord role to unregister').setRequired(true))
    )

    // /selfrole panel
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Spawn an interactive self-role selection panel in a channel (Management Only)')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Target text channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(opt => opt.setName('title').setDescription('Custom header title for the panel').setRequired(false))
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      await SelfRoleService.listSelfRoles(interaction);
      return;
    }

    // All other subcommands require management permissions
    const member = interaction.member as any;
    const auth = PermissionsService.requireManagement(member);

    if (!auth.authorized) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Management authority required.')],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'create') {
      const role = interaction.options.getRole('role', true) as Role;
      const displayName = interaction.options.getString('display_name', true);
      const emoji = interaction.options.getString('emoji') || undefined;
      const description = interaction.options.getString('description') || undefined;

      await SelfRoleService.createSelfRole(interaction, role, displayName, emoji, description);
      return;
    }

    if (subcommand === 'delete') {
      const role = interaction.options.getRole('role', true) as Role;
      await SelfRoleService.deleteSelfRole(interaction, role);
      return;
    }

    if (subcommand === 'panel') {
      const targetChannel = interaction.options.getChannel('channel') as TextChannel | undefined;
      const title = interaction.options.getString('title') || undefined;
      await SelfRoleService.sendSelfRolePanel(interaction, targetChannel || undefined, title);
      return;
    }
  },
};
