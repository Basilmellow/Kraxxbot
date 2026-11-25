"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const say_service_1 = require("../../services/say.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('sayembed')
        .setDescription('Send a formatted rich embed message as KRAXX Bot')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
        .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Embed main description text').setRequired(true))
        .addStringOption(opt => opt.setName('color').setDescription('Optional Hex color code (e.g. #00F0FF)').setRequired(false))
        .addChannelOption(opt => opt
        .setName('channel')
        .setDescription('Target text channel')
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
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);
        const color = interaction.options.getString('color') || undefined;
        const targetChannel = interaction.options.getChannel('channel');
        await say_service_1.SayService.sendSayEmbed(interaction, title, description, color, targetChannel || undefined);
    },
};
