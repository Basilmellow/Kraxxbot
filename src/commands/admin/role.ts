import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { RoleService } from '../../services/role.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role management and inspection system (Authorized Personnel Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub
        .setName('assign')
        .setDescription('Assign an organizational role to a member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to grant').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove an organizational role from a member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Display diagnostic information for a role')
        .addRoleOption(opt => opt.setName('role').setDescription('Target role').setRequired(true))
    ),

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

    if (subcommand === 'assign') {
      await RoleService.assignRole(interaction);
    } else if (subcommand === 'remove') {
      await RoleService.removeRole(interaction);
    } else if (subcommand === 'info') {
      await RoleService.getRoleInfo(interaction);
    }
  },
};
