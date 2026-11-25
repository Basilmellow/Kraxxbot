"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementService = void 0;
const discord_js_1 = require("discord.js");
const announcement_repository_1 = require("../database/repositories/announcement.repository");
const guild_repository_1 = require("../database/repositories/guild.repository");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
const permissions_service_1 = require("./permissions.service");
class AnnouncementService {
    /**
     * Dispatches a corporate announcement submitted via modal interaction.
     * Resolves the target channel from GuildSettings.announcementsChannelId (if set),
     * otherwise falls back to the first available text channel.
     */
    static async handleAnnouncementSubmit(interaction) {
        const member = interaction.member;
        if (!member || !interaction.guild || !interaction.guildId || interaction.guild.id !== interaction.guildId
            || member.guild.id !== interaction.guild.id || member.id !== interaction.user.id) {
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Unauthorized', 'Member and guild context required.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            return;
        }
        const guildId = interaction.guild.id;
        const authorization = permissions_service_1.PermissionsService.requireManagement(member);
        if (!authorization.authorized) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Unauthorized', authorization.reason || 'Management authority required.')], ephemeral: true });
            return;
        }
        if (!(await guild_repository_1.GuildRepository.isModuleEnabled(guildId, 'announcements'))) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Announcements Disabled', 'Announcements are disabled for this server.')], ephemeral: true });
            return;
        }
        const title = interaction.fields.getTextInputValue('title');
        const message = interaction.fields.getTextInputValue('message');
        const departmentInput = (interaction.fields.getTextInputValue('department') || 'GENERAL').toUpperCase().trim();
        const typeInput = (interaction.fields.getTextInputValue('type') || 'GENERAL').toUpperCase().trim();
        const mentionRole = interaction.fields.getTextInputValue('mention_role')?.trim();
        const imageUrl = interaction.fields.getTextInputValue('image_url')?.trim();
        // Resolve target channel from GuildSettings
        let targetChannelId = null;
        try {
            const guild = await guild_repository_1.GuildRepository.findById(guildId);
            if (guild?.settings?.announcementChannelId) {
                targetChannelId = guild.settings.announcementChannelId;
            }
        }
        catch (err) {
            logger_1.logger.warn({ err, guildId }, 'Could not resolve GuildSettings for announcement channel');
        }
        if (!targetChannelId) {
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Channel Not Configured', 'No announcements channel is configured for this server. Please configure it in the dashboard.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            return;
        }
        const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
        if (!targetChannel || targetChannel.guildId !== guildId || ![discord_js_1.ChannelType.GuildText, discord_js_1.ChannelType.GuildAnnouncement].includes(targetChannel.type)) {
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Channel Error', `Configured announcements channel (${targetChannelId}) not found in server.`);
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            return;
        }
        try {
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.announcement(title, message, departmentInput, typeInput, member.displayName, imageUrl || undefined);
            let mentionType = 'NONE';
            let mentionRoleId = null;
            if (mentionRole) {
                if (mentionRole.toLowerCase() === 'everyone') {
                    mentionType = 'EVERYONE';
                }
                else if (mentionRole.toLowerCase() === 'here') {
                    mentionType = 'HERE';
                }
                else if (/^\d+$/.test(mentionRole)) {
                    const configuredRole = await interaction.guild.roles.fetch(mentionRole);
                    if (!configuredRole)
                        throw new Error('ANNOUNCEMENT_ROLE_INVALID');
                    mentionType = 'ROLE';
                    mentionRoleId = configuredRole.id;
                }
            }
            await announcement_repository_1.AnnouncementRepository.enqueueDelivery({
                guildId,
                interactionId: interaction.id,
                title,
                content: message,
                department: departmentInput,
                type: typeInput,
                authorId: member.id,
                channelId: targetChannel.id,
                mentionType,
                mentionRoleId,
                embedPayload: JSON.stringify([embed.toJSON()]),
            });
            const confirmEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Announcement Queued', `Announcement **"${title}"** was durably queued for <#${targetChannel.id}>. Delivery will be confirmed by the scheduler.`);
            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to process announcement');
            const errEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Publication Error', 'Failed to dispatch announcement.');
            await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
    }
}
exports.AnnouncementService = AnnouncementService;
