"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfRoleService = void 0;
const discord_js_1 = require("discord.js");
const selfrole_repository_1 = require("../database/repositories/selfrole.repository");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const policy_1 = require("../security/policy");
const guild_repository_1 = require("../database/repositories/guild.repository");
const audit_repository_1 = require("../database/repositories/audit.repository");
const audit_event_1 = require("./audit-event");
const logger_1 = require("../utils/logger");
class SelfRoleService {
    /**
     * Registers a role as a self-assignable role.
     */
    static async createSelfRole(interaction, role, displayName, emoji, description) {
        const guild = interaction.guild;
        if (!guild || !interaction.guildId || guild.id !== interaction.guildId)
            throw new Error('Self-role guild context is unavailable.');
        const guildId = guild.id;
        if (!(await guild_repository_1.GuildRepository.isModuleEnabled(guildId, 'roles'))) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-roles are disabled for this server.')], ephemeral: true });
            return;
        }
        const actor = await guild.members.fetch(interaction.user.id);
        const bot = await guild.members.fetchMe();
        const liveRole = await guild.roles.fetch(role.id);
        if (!liveRole)
            throw new Error('Role unavailable.');
        (0, policy_1.assertRolePolicy)({ guildId, roleId: liveRole.id, managed: liveRole.managed, position: liveRole.position,
            permissions: liveRole.permissions.bitfield, actorPermissions: actor.permissions.bitfield, botPermissions: bot.permissions.bitfield,
            actorPosition: actor.roles.highest.position, botPosition: bot.roles.highest.position, owner: actor.id === interaction.guild.ownerId }, true);
        const existing = await selfrole_repository_1.SelfRoleRepository.findByRoleId(guildId, role.id);
        if (existing) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Already Exists', `Role ${role} is already configured as a self-role.`)],
                ephemeral: true,
            });
            return;
        }
        await selfrole_repository_1.SelfRoleRepository.createWithAudit({
            guildId,
            roleId: role.id,
            name: displayName,
            actorId: interaction.user.id,
            emoji: emoji || undefined,
            description: description || undefined,
        });
        await interaction.reply({
            embeds: [
                kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Self-Role Created', `Successfully registered ${role} as self-role **${displayName}**.`),
            ],
            ephemeral: true,
        });
    }
    /**
     * Unregisters a self-assignable role.
     */
    static async deleteSelfRole(interaction, role) {
        const guild = interaction.guild;
        if (!guild || !interaction.guildId || guild.id !== interaction.guildId)
            throw new Error('Self-role guild context is unavailable.');
        const guildId = guild.id;
        if (!(await guild_repository_1.GuildRepository.isModuleEnabled(guildId, 'roles'))) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-roles are disabled for this server.')], ephemeral: true });
            return;
        }
        const removed = await selfrole_repository_1.SelfRoleRepository.deleteWithAudit(guildId, role.id, interaction.user.id);
        if (!removed) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Not Found', `Role ${role} is not configured as a self-role.`)],
                ephemeral: true,
            });
            return;
        }
        await interaction.reply({
            embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Self-Role Deleted', `Removed ${role} from self-assignable roles.`)],
            ephemeral: true,
        });
    }
    /**
     * Lists all configured self-assignable roles for this guild.
     */
    static async listSelfRoles(interaction) {
        const guildId = interaction.guildId;
        if (!interaction.guild || !guildId || interaction.guild.id !== guildId) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Unavailable', 'Self-roles are available only inside a server.')], ephemeral: true });
            return;
        }
        if (!(await guild_repository_1.GuildRepository.isModuleEnabled(guildId, 'roles'))) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-roles are disabled for this server.')], ephemeral: true });
            return;
        }
        const roles = await selfrole_repository_1.SelfRoleRepository.listByGuild(guildId);
        if (roles.length === 0) {
            await interaction.reply({
                embeds: [
                    kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('SELF-ROLES', 'ROLES')
                        .setDescription('No self-assignable roles are currently configured.'),
                ],
                ephemeral: true,
            });
            return;
        }
        const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('SELF-ASSIGNABLE ROLES', 'ROLES');
        const lines = roles.map((r) => `• ${r.emoji ? `${r.emoji} ` : ''}**${r.name}** (<@&${r.roleId}>)${r.description ? `\n  *${r.description}*` : ''}`);
        embed.setDescription(lines.join('\n\n'));
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    /**
     * Spawns an interactive role select menu panel in a channel.
     */
    static async sendSelfRolePanel(interaction, targetChannel, customTitle) {
        const guild = interaction.guild;
        if (!guild || !interaction.guildId || guild.id !== interaction.guildId)
            throw new Error('Self-role guild context is unavailable.');
        const guildId = guild.id;
        if (!(await guild_repository_1.GuildRepository.isModuleEnabled(guildId, 'roles'))) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-roles are disabled for this server.')], ephemeral: true });
            return;
        }
        const channel = (targetChannel || interaction.channel);
        if (!channel || channel.guildId !== guildId || channel.type !== discord_js_1.ChannelType.GuildText) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Channel', 'Select a text channel in this server.')], ephemeral: true });
            return;
        }
        const roles = await selfrole_repository_1.SelfRoleRepository.listByGuild(guildId);
        if (roles.length === 0) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('No Self-Roles', 'Please configure self-roles using `/selfrole create` first.')],
                ephemeral: true,
            });
            return;
        }
        const embed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
        embed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.BRAND);
        embed.setTitle(`${customTitle || 'SELF-ROLE SELECTION'}`);
        embed.setDescription(`Select roles from the dropdown menu below to assign or remove them from your profile.\n\n` +
            `You can select multiple roles or update your choices at any time.`);
        const options = roles.slice(0, 25).map((r) => {
            const opt = new discord_js_1.StringSelectMenuOptionBuilder()
                .setLabel(r.name)
                .setValue(r.roleId)
                .setDescription(r.description || `Toggle @${r.name} role`);
            if (r.emoji) {
                try {
                    opt.setEmoji(r.emoji);
                }
                catch {
                    // Ignore invalid emojis gracefully
                }
            }
            return opt;
        });
        const selectMenu = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('kraxx_selfrole_select')
            .setPlaceholder('Select your roles...')
            .setMinValues(0)
            .setMaxValues(options.length)
            .addOptions(options);
        const row = new discord_js_1.ActionRowBuilder().addComponents(selectMenu);
        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({
            embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Panel Created', `Self-role selection panel posted in ${channel}.`)],
            ephemeral: true,
        });
    }
    /**
     * Handles user selection from the self-role dropdown menu.
     */
    static async handleRoleSelection(interaction) {
        const member = interaction.member;
        const guildId = interaction.guildId;
        if (!member || !interaction.guild || !guildId || interaction.guild.id !== guildId
            || member.guild.id !== guildId || member.id !== interaction.user.id) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Member context could not be resolved.')],
                ephemeral: true,
            });
            return;
        }
        if (!(await guild_repository_1.GuildRepository.isModuleEnabled(guildId, 'roles'))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Self-Roles Unavailable', 'Self-assignable roles are disabled for this server.')],
                ephemeral: true,
            });
            return;
        }
        const selectedRoleIds = interaction.values;
        const configuredSelfRoles = await selfrole_repository_1.SelfRoleRepository.listByGuild(guildId);
        const selfRoleMap = new Map(configuredSelfRoles.map((r) => [r.roleId, r]));
        const added = [];
        const removed = [];
        const prior = new Map();
        const planned = [];
        const bot = await interaction.guild.members.fetchMe();
        // Validate only roles whose state will change. A deleted/stale unrelated
        // panel entry must not prevent a valid selection from being applied.
        for (const [roleId, selfRole] of selfRoleMap.entries()) {
            const hasRole = member.roles.cache.has(roleId);
            const isSelected = selectedRoleIds.includes(roleId);
            if (hasRole === isSelected)
                continue;
            const role = await interaction.guild.roles.fetch(roleId);
            if (!role)
                throw new Error('Panel contains an unavailable role.');
            (0, policy_1.assertRolePolicy)({ guildId, roleId, managed: role.managed, position: role.position, permissions: role.permissions.bitfield,
                actorPermissions: bot.permissions.bitfield, botPermissions: bot.permissions.bitfield,
                actorPosition: bot.roles.highest.position, botPosition: bot.roles.highest.position, owner: true }, true);
            prior.set(roleId, hasRole);
            if (isSelected && !hasRole) {
                planned.push(roleId);
                try {
                    await member.roles.add(roleId);
                }
                catch (error) {
                    await this.finishFailedSelection(interaction, member, prior, planned, error);
                    return;
                }
                added.push(selfRole.name);
            }
            else if (!isSelected && hasRole) {
                planned.push(roleId);
                try {
                    await member.roles.remove(roleId);
                }
                catch (error) {
                    await this.finishFailedSelection(interaction, member, prior, planned, error);
                    return;
                }
                removed.push(selfRole.name);
            }
        }
        const summaryParts = [];
        if (added.length > 0)
            summaryParts.push(`✅ **Added:** ${added.join(', ')}`);
        if (removed.length > 0)
            summaryParts.push(`❌ **Removed:** ${removed.join(', ')}`);
        if (summaryParts.length === 0)
            summaryParts.push('ℹ️ No changes were made to your roles.');
        try {
            await audit_repository_1.AuditRepository.create({
                guildId, executorId: interaction.user.id, targetId: member.id, action: 'SELF_ROLE_UPDATE',
                details: (0, audit_event_1.createAuditDetails)({ source: 'BOT', targetType: 'MEMBER', outcome: 'SUCCESS', metadata: { added, removed } }),
            });
        }
        catch (error) {
            await this.finishFailedSelection(interaction, member, prior, planned, error);
            return;
        }
        await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Roles Updated', summaryParts.join('\n\n'))], ephemeral: true });
    }
    static async restoreSelection(member, prior, roleIds) {
        try {
            await member.fetch(true);
        }
        catch {
            return [...new Set(roleIds)];
        }
        const failures = [];
        for (const roleId of [...new Set(roleIds)].reverse()) {
            const hadRole = prior.get(roleId);
            if (hadRole === undefined || member.roles.cache.has(roleId) === hadRole)
                continue;
            try {
                if (hadRole)
                    await member.roles.add(roleId);
                else
                    await member.roles.remove(roleId);
            }
            catch {
                failures.push(roleId);
            }
        }
        return failures;
    }
    static async finishFailedSelection(interaction, member, prior, roleIds, cause) {
        const rollbackFailures = await this.restoreSelection(member, prior, roleIds);
        const outcome = rollbackFailures.length ? 'UNKNOWN' : 'FAILURE';
        try {
            await audit_repository_1.AuditRepository.create({
                guildId: interaction.guildId, executorId: interaction.user.id, targetId: member.id, action: 'SELF_ROLE_UPDATE',
                details: (0, audit_event_1.createAuditDetails)({ source: 'BOT', targetType: 'MEMBER', outcome, metadata: {
                        failed: true,
                        errorType: cause instanceof Error ? cause.name : 'UnknownError',
                        rollbackFailedRoleIds: rollbackFailures,
                        affectedRoleIds: roleIds,
                    } }),
            });
        }
        catch (auditError) {
            logger_1.logger.error({ guildId: interaction.guildId, userId: member.id, errorType: auditError instanceof Error ? auditError.name : 'UnknownError' }, 'Self-role failure audit could not be persisted');
        }
        await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error(outcome === 'UNKNOWN' ? 'Role Update Needs Review' : 'Role Update Failed', outcome === 'UNKNOWN' ? 'Some role changes may remain. Ask a server administrator to review your roles.' : 'The role update failed and completed changes were rolled back.')], ephemeral: true });
    }
}
exports.SelfRoleService = SelfRoleService;
