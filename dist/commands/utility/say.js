"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const say_service_1 = require("../../services/say.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('say')
        .setDescription('Send a raw text message as KRAXX Bot (supports multiline text & formatting)')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
        .addStringOption(opt => opt
        .setName('message')
        .setDescription('Text to send (leave empty to open a multiline text popup modal)')
        .setRequired(false))
        .addChannelOption(opt => opt
        .setName('channel')
        .setDescription('Target text channel (defaults to current channel)')
        .addChannelTypes(discord_js_1.ChannelType.GuildText)
        .setRequired(false)),
    async execute(interaction) {
        const member = interaction.member;
        const auth = permissions_service_1.PermissionsService.requireTeamLead(member);
        if (!auth.authorized) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Insufficient permissions.')],
                ephemeral: true,
            });
            return;
        }
        const message = interaction.options.getString('message');
        const targetChannel = interaction.options.getChannel('channel');
        // If message text was provided directly in option, send immediately
        if (message && message.trim().length > 0) {
            await say_service_1.SayService.sendSay(interaction, message, targetChannel || undefined);
            return;
        }
        // Otherwise, open multiline paragraph Modal for comfortable pasting of long formatted text
        await say_service_1.SayService.openSayModal(interaction, targetChannel?.id);
    },
};
