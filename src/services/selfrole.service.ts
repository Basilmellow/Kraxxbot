import {
ChannelType,
ActionRowBuilder,
ChatInputCommandInteraction,
GuildMember,
Role,
StringSelectMenuBuilder,
StringSelectMenuInteraction,
StringSelectMenuOptionBuilder,
TextChannel,
} from 'discord.js';
import { SelfRoleRepository } from '../database/repositories/selfrole.repository';
import { KRAXX_COLORS,KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { assertRolePolicy } from '../security/policy';
import { GuildRepository } from '../database/repositories/guild.repository';
import { AuditRepository } from '../database/repositories/audit.repository';
import { createAuditDetails } from './audit-event';
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
    const guild = interaction.guild;
    if (!guild || !interaction.guildId || guild.id !== interaction.guildId) throw new Error('Self-role guild context is unavailable.');
    const guildId = guild.id;
    if (!(await GuildRepository.isModuleEnabled(guildId, 'roles'))) {
      await interaction.reply({ embeds: [KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-roles are disabled for this server.')], ephemeral: true });
      return;
    }
    const actor = await guild.members.fetch(interaction.user.id);
    const bot = await guild.members.fetchMe();
    const liveRole = await guild.roles.fetch(role.id);
    if (!liveRole) throw new Error('Role unavailable.');
    assertRolePolicy({guildId,roleId:liveRole.id,managed:liveRole.managed,position:liveRole.position,
      permissions:liveRole.permissions.bitfield,actorPermissions:actor.permissions.bitfield,botPermissions:bot.permissions.bitfield,
      actorPosition:actor.roles.highest.position,botPosition:bot.roles.highest.position,owner:actor.id===interaction.guild!.ownerId}, true);
    const existing = await SelfRoleRepository.findByRoleId(guildId, role.id);
    if (existing) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Already Exists', `Role ${role} is already configured as a self-role.`)],
        ephemeral: true,
      });
      return;
    }

    await SelfRoleRepository.createWithAudit({
      guildId,
      roleId: role.id,
      name: displayName,
      actorId: interaction.user.id,
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

  }

  /**
   * Unregisters a self-assignable role.
   */
  static async deleteSelfRole(
    interaction: ChatInputCommandInteraction,
    role: Role
  ): Promise<void> {
    const guild = interaction.guild;
    if (!guild || !interaction.guildId || guild.id !== interaction.guildId) throw new Error('Self-role guild context is unavailable.');
    const guildId = guild.id;
    if (!(await GuildRepository.isModuleEnabled(guildId, 'roles'))) {
      await interaction.reply({ embeds: [KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-roles are disabled for this server.')], ephemeral: true });
      return;
    }
    const removed = await SelfRoleRepository.deleteWithAudit(guildId, role.id, interaction.user.id);
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

  }

  /**
   * Lists all configured self-assignable roles for this guild.
   */
  static async listSelfRoles(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!interaction.guild || !guildId || interaction.guild.id !== guildId) {
      await interaction.reply({ embeds: [KraxxEmbedBuilder.error('Unavailable', 'Self-roles are available only inside a server.')], ephemeral: true });
      return;
    }
    if (!(await GuildRepository.isModuleEnabled(guildId, 'roles'))) {
      await interaction.reply({ embeds: [KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-roles are disabled for this server.')], ephemeral: true });
      return;
    }
    const roles = await SelfRoleRepository.listByGuild(guildId);

    if (roles.length === 0) {
      await interaction.reply({
        embeds: [
          KraxxEmbedBuilder.createHeader('SELF-ROLES', 'ROLES')
            .setDescription('No self-assignable roles are currently configured.'),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = KraxxEmbedBuilder.createHeader('SELF-ASSIGNABLE ROLES', 'ROLES');
    const lines = roles.map(
      (r) => `• ${r.emoji ? `${r.emoji} ` : ''}**${r.name}** (<@&${r.roleId}>)${r.description ? `\n  *${r.description}*` : ''}`
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
    const guild = interaction.guild;
    if (!guild || !interaction.guildId || guild.id !== interaction.guildId) throw new Error('Self-role guild context is unavailable.');
    const guildId = guild.id;
    if (!(await GuildRepository.isModuleEnabled(guildId, 'roles'))) {
      await interaction.reply({ embeds: [KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-roles are disabled for this server.')], ephemeral: true });
      return;
    }
    const channel = (targetChannel || interaction.channel) as TextChannel;
    if (!channel || channel.guildId !== guildId || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [KraxxEmbedBuilder.error('Invalid Channel', 'Select a text channel in this server.')], ephemeral: true });
      return;
    }
    const roles = await SelfRoleRepository.listByGuild(guildId);

    if (roles.length === 0) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('No Self-Roles', 'Please configure self-roles using `/selfrole create` first.')],
        ephemeral: true,
      });
      return;
    }

    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.BRAND);
    embed.setTitle(`${customTitle || 'SELF-ROLE SELECTION'}`);
    embed.setDescription(
      `Select roles from the dropdown menu below to assign or remove them from your profile.\n\n` +
      `You can select multiple roles or update your choices at any time.`
    );

    const options = roles.slice(0, 25).map((r) => {
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
    const guildId = interaction.guildId;

    if (!member || !interaction.guild || !guildId || interaction.guild.id !== guildId
      || member.guild.id !== guildId || member.id !== interaction.user.id) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Member context could not be resolved.')],
        ephemeral: true,
      });
      return;
    }

    if (!(await GuildRepository.isModuleEnabled(guildId, 'roles'))) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-assignable roles are disabled for this server.')],
        ephemeral: true,
      });
      return;
    }

    const selectedRoleIds = interaction.values;
    const configuredSelfRoles = await SelfRoleRepository.listByGuild(guildId);
    const selfRoleMap = new Map(configuredSelfRoles.map((r) => [r.roleId, r]));

    const added: string[] = [];
    const removed: string[] = [];
    const prior = new Map<string, boolean>();
    const planned: string[] = [];

    const bot = await interaction.guild.members.fetchMe();
    // Validate only roles whose state will change. A deleted/stale unrelated
    // panel entry must not prevent a valid selection from being applied.
    for (const [roleId, selfRole] of selfRoleMap.entries()) {
      const hasRole = member.roles.cache.has(roleId);
      const isSelected = selectedRoleIds.includes(roleId);
      if (hasRole === isSelected) continue;
      const role = await interaction.guild!.roles.fetch(roleId);
      if (!role) throw new Error('Panel contains an unavailable role.');
      assertRolePolicy({guildId,roleId,managed:role.managed,position:role.position,permissions:role.permissions.bitfield,
        actorPermissions:bot.permissions.bitfield,botPermissions:bot.permissions.bitfield,
        actorPosition:bot.roles.highest.position,botPosition:bot.roles.highest.position,owner:true}, true);
      prior.set(roleId, hasRole);

      if (isSelected && !hasRole) {
        planned.push(roleId);
        try { await member.roles.add(roleId); }
        catch (error) {
          await this.finishFailedSelection(interaction, member, prior, planned, error);
          return;
        }
        added.push(selfRole.name);
      } else if (!isSelected && hasRole) {
        planned.push(roleId);
        try { await member.roles.remove(roleId); }
        catch (error) {
          await this.finishFailedSelection(interaction, member, prior, planned, error);
          return;
        }
        removed.push(selfRole.name);
      }
    }

    const summaryParts: string[] = [];
    if (added.length > 0) summaryParts.push(`✅ **Added:** ${added.join(', ')}`);
    if (removed.length > 0) summaryParts.push(`❌ **Removed:** ${removed.join(', ')}`);
    if (summaryParts.length === 0) summaryParts.push('ℹ️ No changes were made to your roles.');

    try {
      await AuditRepository.create({
        guildId, executorId: interaction.user.id, targetId: member.id, action: 'SELF_ROLE_UPDATE',
        details: createAuditDetails({ source: 'BOT', targetType: 'MEMBER', outcome: 'SUCCESS', metadata: { added, removed } }),
      });
    } catch (error) {
      await this.finishFailedSelection(interaction, member, prior, planned, error);
      return;
    }
    await interaction.reply({ embeds: [KraxxEmbedBuilder.success('Roles Updated', summaryParts.join('\n\n'))], ephemeral: true });
  }

  private static async restoreSelection(member: GuildMember, prior: Map<string, boolean>, roleIds: string[]): Promise<string[]> {
    try { await member.fetch(true); }
    catch { return [...new Set(roleIds)]; }
    const failures: string[] = [];
    for (const roleId of [...new Set(roleIds)].reverse()) {
      const hadRole = prior.get(roleId);
      if (hadRole === undefined || member.roles.cache.has(roleId) === hadRole) continue;
      try {
        if (hadRole) await member.roles.add(roleId);
        else await member.roles.remove(roleId);
      } catch { failures.push(roleId); }
    }
    return failures;
  }

  private static async finishFailedSelection(
    interaction: StringSelectMenuInteraction, member: GuildMember, prior: Map<string, boolean>, roleIds: string[], cause: unknown,
  ): Promise<void> {
    const rollbackFailures = await this.restoreSelection(member, prior, roleIds);
    const outcome = rollbackFailures.length ? 'UNKNOWN' as const : 'FAILURE' as const;
    try {
      await AuditRepository.create({
        guildId: interaction.guildId!, executorId: interaction.user.id, targetId: member.id, action: 'SELF_ROLE_UPDATE',
        details: createAuditDetails({ source: 'BOT', targetType: 'MEMBER', outcome, metadata: {
          failed: true,
          errorType: cause instanceof Error ? cause.name : 'UnknownError',
          rollbackFailedRoleIds: rollbackFailures,
          affectedRoleIds: roleIds,
        } }),
      });
    } catch (auditError) {
      logger.error({ guildId: interaction.guildId, userId: member.id, errorType: auditError instanceof Error ? auditError.name : 'UnknownError' }, 'Self-role failure audit could not be persisted');
    }
    await interaction.reply({ embeds: [KraxxEmbedBuilder.error(
      outcome === 'UNKNOWN' ? 'Role Update Needs Review' : 'Role Update Failed',
      outcome === 'UNKNOWN' ? 'Some role changes may remain. Ask a server administrator to review your roles.' : 'The role update failed and completed changes were rolled back.',
    )], ephemeral: true });
  }
}
