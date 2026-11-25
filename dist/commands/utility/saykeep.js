"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const say_service_1 = require("../../services/say.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('saykeep')
        .setDescription('Pin and archive a message sent by KRAXX Bot')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
        .addStringOption(opt => opt.setName('message_id').setDescription('ID of the message to pin').setRequired(true)),
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
        await say_service_1.SayService.keepSay(interaction, messageId);
    },
};
