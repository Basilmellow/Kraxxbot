"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const say_service_1 = require("../../services/say.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('sayreply')
        .setDescription('Send a reply to a message as KRAXX Bot')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
        .addStringOption(opt => opt.setName('message_id').setDescription('ID of the message to reply to').setRequired(true))
        .addStringOption(opt => opt.setName('content').setDescription('Reply message content').setRequired(true)),
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
        const messageId = interaction.options.getString('message_id', true);
        const content = interaction.options.getString('content', true);
        await say_service_1.SayService.replySay(interaction, messageId, content);
    },
};
