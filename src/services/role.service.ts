import { ChatInputCommandInteraction, GuildMember, Role } from 'discord.js';
import { canManageRole, ORGANIZATIONAL_ROLES } from '../config/roles';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class RoleService {
  /**
   * Assigns a role to a target member after verifying hierarchical permission bounds.
   */
  static async assignRole(interaction: ChatInputCommandInteraction): Promise<void> {
    const executor = interaction.member as GuildMember | null;
    const targetMember = interaction.options.getMember('user') as GuildMember | null;
    const role = interaction.options.getRole('role') as Role | null;

    if (!executor || !targetMember || !role) {
      const errEmbed = KraxxEmbedBuilder.error('Invalid Parameters', 'Missing executor, target member, or target role.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    // Check authority bounds
    const authCheck = canManageRole(executor, role.id);
    if (!authCheck.allowed) {
      const errEmbed = KraxxEmbedBuilder.error('Access Denied', authCheck.reason || 'Hierarchy check failed.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    try {
      if (targetMember.roles.cache.has(role.id)) {
        const infoEmbed = KraxxEmbedBuilder.error('Role Already Assigned', `<@${targetMember.id}> already possesses the <@&${role.id}> role.`);
        await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
        return;
      }

      await targetMember.roles.add(role);

      const successEmbed = KraxxEmbedBuilder.success(
        'Role Assigned',
        `Successfully granted <@&${role.id}> to <@${targetMember.id}>.`
      );
      await interaction.reply({ embeds: [successEmbed], ephemeral: false });

      await AuditService.logEvent(
        interaction.guild,
        'ROLE_ASSIGN',
        executor.id,
        targetMember.id,
        `Assigned role: ${role.name} (${role.id})`
      );
    } catch (error) {
      logger.error({ err: error, target: targetMember.id, role: role.id }, 'Failed to assign role');
      const errEmbed = KraxxEmbedBuilder.error('Role Error', 'Failed to assign role. Ensure KRAXX Bot role is positioned higher in server hierarchy.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
  }

  /**
   * Removes a role from a target member after verifying hierarchical authority.
   */
  static async removeRole(interaction: ChatInputCommandInteraction): Promise<void> {
    const executor = interaction.member as GuildMember | null;
    const targetMember = interaction.options.getMember('user') as GuildMember | null;
    const role = interaction.options.getRole('role') as Role | null;

    if (!executor || !targetMember || !role) {
      const errEmbed = KraxxEmbedBuilder.error('Invalid Parameters', 'Missing required interaction parameters.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    const authCheck = canManageRole(executor, role.id);
    if (!authCheck.allowed) {
      const errEmbed = KraxxEmbedBuilder.error('Access Denied', authCheck.reason || 'Hierarchy check failed.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    try {
      if (!targetMember.roles.cache.has(role.id)) {
        const infoEmbed = KraxxEmbedBuilder.error('Role Not Found', `<@${targetMember.id}> does not possess the <@&${role.id}> role.`);
        await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
        return;
      }

      await targetMember.roles.remove(role);

      const successEmbed = KraxxEmbedBuilder.success(
        'Role Removed',
        `Successfully removed <@&${role.id}> from <@${targetMember.id}>.`
      );
      await interaction.reply({ embeds: [successEmbed], ephemeral: false });

      await AuditService.logEvent(
        interaction.guild,
        'ROLE_REMOVE',
        executor.id,
        targetMember.id,
        `Removed role: ${role.name} (${role.id})`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to remove role');
      const errEmbed = KraxxEmbedBuilder.error('Role Error', 'Failed to remove role.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
  }

  /**
   * Displays diagnostic information regarding a role.
   */
  static async getRoleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const role = interaction.options.getRole('role') as Role | null;

    if (!role) {
      const errEmbed = KraxxEmbedBuilder.error('Invalid Parameter', 'Target role required.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    const knownConfig = Object.values(ORGANIZATIONAL_ROLES).find(r => r.id === role.id);

    const embed = KraxxEmbedBuilder.createHeader(role.name, 'ROLE SPECIFICATION');
    embed.addFields(
      { name: 'Role ID', value: `\`${role.id}\``, inline: true },
      { name: 'Color Hex', value: `\`${role.hexColor}\``, inline: true },
      { name: 'Position', value: `\`${role.position}\``, inline: true },
      { name: 'Members Count', value: `\`${role.members.size}\``, inline: true },
      { name: 'Organizational Tier', value: `\`${knownConfig ? knownConfig.priority : 'Custom/Unmapped'}\``, inline: true },
      { name: 'Hoisted / Mentionable', value: `Hoisted: \`${role.hoist}\` | Mentionable: \`${role.mentionable}\``, inline: false }
    );

    if (knownConfig) {
      embed.addFields({ name: 'Description', value: knownConfig.description, inline: false });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
