"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = void 0;
const roles_1 = require("../config/roles");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
const audit_service_1 = require("./audit.service");
class RoleService {
    /**
     * Assigns a role to a target member after verifying hierarchical permission bounds.
     */
    static async assignRole(interaction) {
        const executor = interaction.member;
        const targetMember = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');
        if (!executor || !targetMember || !role) {
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Parameters', 'Missing executor, target member, or target role.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            return;
        }
        await executor.fetch();
        await executor.guild.members.fetchMe();
        await executor.guild.roles.fetch();
        // Check authority bounds
        await executor.fetch();
        await executor.guild.members.fetchMe();
        await executor.guild.roles.fetch();
        const authCheck = (0, roles_1.canManageDiscordRole)(executor, executor.guild.roles.cache.get(role.id) ?? role);
        if (!authCheck.allowed) {
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', authCheck.reason || 'Hierarchy check failed.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            return;
        }
        try {
            if (targetMember.roles.cache.has(role.id)) {
                const infoEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Role Already Assigned', `<@${targetMember.id}> already possesses the <@&${role.id}> role.`);
                await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
                return;
            }
            await targetMember.roles.add(role);
            const successEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Role Assigned', `Successfully granted <@&${role.id}> to <@${targetMember.id}>.`);
            await interaction.reply({ embeds: [successEmbed], ephemeral: false });
            await audit_service_1.AuditService.logEvent(interaction.guild, 'ROLE_ASSIGN', executor.id, targetMember.id, `Assigned role: ${role.name} (${role.id})`);
        }
        catch (error) {
            logger_1.logger.error({ err: error, target: targetMember.id, role: role.id }, 'Failed to assign role');
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Role Error', 'Failed to assign role. Ensure KRAXX Bot role is positioned higher in server hierarchy.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
    }
    /**
     * Removes a role from a target member after verifying hierarchical authority.
     */
    static async removeRole(interaction) {
        const executor = interaction.member;
        const targetMember = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');
        if (!executor || !targetMember || !role) {
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Parameters', 'Missing required interaction parameters.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            return;
        }
        const authCheck = (0, roles_1.canManageDiscordRole)(executor, role);
        if (!authCheck.allowed) {
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', authCheck.reason || 'Hierarchy check failed.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            return;
        }
        try {
            if (!targetMember.roles.cache.has(role.id)) {
                const infoEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Role Not Found', `<@${targetMember.id}> does not possess the <@&${role.id}> role.`);
                await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
                return;
            }
            await targetMember.roles.remove(role);
            const successEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Role Removed', `Successfully removed <@&${role.id}> from <@${targetMember.id}>.`);
            await interaction.reply({ embeds: [successEmbed], ephemeral: false });
            await audit_service_1.AuditService.logEvent(interaction.guild, 'ROLE_REMOVE', executor.id, targetMember.id, `Removed role: ${role.name} (${role.id})`);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to remove role');
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Role Error', 'Failed to remove role.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
    }
    /**
     * Displays diagnostic information regarding a role.
     */
    static async getRoleInfo(interaction) {
        const role = interaction.options.getRole('role');
        if (!role) {
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Parameter', 'Target role required.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            return;
        }
        const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader(role.name, 'ROLE SPECIFICATION');
        embed.addFields({ name: 'Role ID', value: `\`${role.id}\``, inline: true }, { name: 'Color Hex', value: `\`${role.hexColor}\``, inline: true }, { name: 'Position', value: `\`${role.position}\``, inline: true }, { name: 'Members Count', value: `\`${role.members.size}\``, inline: true }, { name: 'Hoisted / Mentionable', value: `Hoisted: \`${role.hoist}\` | Mentionable: \`${role.mentionable}\``, inline: false });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
exports.RoleService = RoleService;
