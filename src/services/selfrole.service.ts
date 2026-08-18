import {
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  TextChannel,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  GuildMember,
  Role,
} from 'discord.js';
import { SelfRoleRepository } from '../database/repositories/selfrole.repository';
import { KraxxEmbedBuilder, KRAXX_COLORS } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class SelfRoleService {
  /**
   * Registers a role as a self-assignable role.
   */
  static async createSelfRole(
    interaction: ChatInputCommandInteraction,
    role: Role,
    displayName: string,
    emoji?: string,
    description?: string
  ): Promise<void> {
    const existing = await SelfRoleRepository.findByRoleId(role.id);
    if (existing) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Already Exists', `Role ${role} is already configured as a self-role.`)],
        ephemeral: true,
      });
      return;
    }

    await SelfRoleRepository.create({
      roleId: role.id,
      name: displayName,
      emoji: emoji || undefined,
      description: description || undefined,
    });

    await interaction.reply({
      embeds: [
        KraxxEmbedBuilder.success(
          'Self-Role Created',
          `Successfully registered ${role} as self-role **${displayName}**.`
        ),
      ],
      ephemeral: true,
    });

    logger.info({ executor: interaction.user.tag, roleId: role.id, displayName }, 'Created self-role');
  }

  /**
   * Unregisters a self-assignable role.
   */
  static async deleteSelfRole(
    interaction: ChatInputCommandInteraction,
    role: Role
  ): Promise<void> {
    const removed = await SelfRoleRepository.deleteByRoleId(role.id);
    if (!removed) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Not Found', `Role ${role} is not configured as a self-role.`)],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Self-Role Deleted', `Removed ${role} from self-assignable roles.`)],
      ephemeral: true,
    });

    logger.info({ executor: interaction.user.tag, roleId: role.id }, 'Deleted self-role');
  }

  /**
   * Lists all configured self-assignable roles.
   */
  static async listSelfRoles(interaction: ChatInputCommandInteraction): Promise<void> {
    const roles = await SelfRoleRepository.findAll();

    if (roles.length === 0) {
      await interaction.reply({
        embeds: [
          KraxxEmbedBuilder.createHeader('KRAXX HQ │ SELF-ROLES', 'ROLES')
            .setDescription('No self-assignable roles are currently configured in KRAXX HQ.'),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = KraxxEmbedBuilder.createHeader('KRAXX HQ │ SELF-ASSIGNABLE ROLES', 'ROLES');
    const lines = roles.map(
      r => `• ${r.emoji ? `${r.emoji} ` : ''}**${r.name}** (<@&${r.roleId}>)${r.description ? `\n  *${r.description}*` : ''}`
    );
    embed.setDescription(lines.join('\n\n'));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /**
   * Spawns an interactive role select menu panel in a channel.
   */
  static async sendSelfRolePanel(
    interaction: ChatInputCommandInteraction,
    targetChannel?: TextChannel,
    customTitle?: string
  ): Promise<void> {
    const channel = (targetChannel || interaction.channel) as TextChannel;
    const roles = await SelfRoleRepository.findAll();

    if (roles.length === 0) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('No Self-Roles', 'Please configure self-roles using `/selfrole create` first.')],
        ephemeral: true,
      });
      return;
    }

    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.BRAND);
    embed.setTitle(`KRAXX HQ │ ${customTitle || 'SELF-ROLE SELECTION'}`);
    embed.setDescription(
      `Select roles from the dropdown menu below to assign or remove them from your profile.\n\n` +
      `You can select multiple roles or update your choices at any time.`
    );

    const options = roles.slice(0, 25).map(r => {
      const opt = new StringSelectMenuOptionBuilder()
        .setLabel(r.name)
        .setValue(r.roleId)
        .setDescription(r.description || `Toggle @${r.name} role`);
      if (r.emoji) {
        try {
          opt.setEmoji(r.emoji);
        } catch {
          // Ignore invalid emojis gracefully
        }
      }
      return opt;
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('kraxx_selfrole_select')
      .setPlaceholder('Select your roles...')
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Panel Created', `Self-role selection panel posted in ${channel}.`)],
      ephemeral: true,
    });
  }

  /**
   * Handles user selection from the self-role dropdown menu.
   */
  static async handleRoleSelection(interaction: StringSelectMenuInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    if (!member) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Member context could not be resolved.')],
        ephemeral: true,
      });
      return;
    }

    const selectedRoleIds = interaction.values; // Array of selected role IDs
    const configuredSelfRoles = await SelfRoleRepository.findAll();
    const selfRoleMap = new Map(configuredSelfRoles.map(r => [r.roleId, r]));

    const added: string[] = [];
    const removed: string[] = [];

    for (const [roleId, selfRole] of selfRoleMap.entries()) {
      const hasRole = member.roles.cache.has(roleId);
      const isSelected = selectedRoleIds.includes(roleId);

      if (isSelected && !hasRole) {
        await member.roles.add(roleId).catch(() => {});
        added.push(selfRole.name);
      } else if (!isSelected && hasRole) {
        await member.roles.remove(roleId).catch(() => {});
        removed.push(selfRole.name);
      }
    }

    const summaryParts: string[] = [];
    if (added.length > 0) summaryParts.push(`✅ **Added:** ${added.join(', ')}`);
    if (removed.length > 0) summaryParts.push(`❌ **Removed:** ${removed.join(', ')}`);
    if (summaryParts.length === 0) summaryParts.push('ℹ️ No changes were made to your roles.');

    const embed = KraxxEmbedBuilder.success('Roles Updated', summaryParts.join('\n\n'));
    await interaction.reply({ embeds: [embed], ephemeral: true });

    logger.info({ user: member.user.tag, added, removed }, 'User updated self-roles');
  }
}
