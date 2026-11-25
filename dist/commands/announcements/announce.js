"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('announce')
        .setDescription('Publish a corporate announcement (Opens Modal Interface)'),
    async execute(interaction) {
        const member = interaction.member;
        const auth = permissions_service_1.PermissionsService.requireManagement(member);
        if (!auth.authorized) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
                ephemeral: true,
            });
            return;
        }
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId('kraxx_announce_modal')
            .setTitle('Publish KRAXX Announcement');
        const titleInput = new discord_js_1.TextInputBuilder()
            .setCustomId('title')
            .setLabel('Announcement Title')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder('Enter concise headline title...')
            .setRequired(true)
            .setMaxLength(100);
        const messageInput = new discord_js_1.TextInputBuilder()
            .setCustomId('message')
            .setLabel('Announcement Message Body')
            .setStyle(discord_js_1.TextInputStyle.Paragraph)
            .setPlaceholder('Enter full announcement details...')
            .setRequired(true)
            .setMaxLength(2000);
        const departmentInput = new discord_js_1.TextInputBuilder()
            .setCustomId('department')
            .setLabel('Department (GENERAL / KRAXXSEC / KRAXX_STUDIO)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setValue('GENERAL')
            .setRequired(false);
        const typeInput = new discord_js_1.TextInputBuilder()
            .setCustomId('type')
            .setLabel('Category (GENERAL/IMPORTANT/EVENT/MAINTENANCE)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setValue('GENERAL')
            .setRequired(false);
        const mentionInput = new discord_js_1.TextInputBuilder()
            .setCustomId('mention_role')
            .setLabel('Role Mention (everyone / here / role_id)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(false);
        modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(titleInput), new discord_js_1.ActionRowBuilder().addComponents(messageInput), new discord_js_1.ActionRowBuilder().addComponents(departmentInput), new discord_js_1.ActionRowBuilder().addComponents(typeInput), new discord_js_1.ActionRowBuilder().addComponents(mentionInput));
        await interaction.showModal(modal);
    },
};
