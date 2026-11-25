"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('setup')
        .setDescription('Publish system embeds and interactive panels')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
        .setName('welcome-embed')
        .setDescription('Publish official Welcome panel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true)))
        .addSubcommand(sub => sub
        .setName('verify-embed')
        .setDescription('Publish official Verification panel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))),
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
        const subcommand = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('channel', true);
        if (!targetChannel.isTextBased()) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Channel', 'Target channel must be a text channel.')],
                ephemeral: true,
            });
            return;
        }
        if (subcommand === 'welcome-embed') {
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.welcome(interaction.guild?.name);
            const verifyButton = new discord_js_1.ButtonBuilder()
                .setCustomId('kraxx_verify')
                .setLabel('VERIFY')
                .setStyle(discord_js_1.ButtonStyle.Primary);
            const row = new discord_js_1.ActionRowBuilder().addComponents(verifyButton);
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Setup Published', `Welcome panel dispatched to <#${targetChannel.id}>.`)],
                ephemeral: true,
            });
        }
        else if (subcommand === 'verify-embed') {
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.verification(interaction.guild?.name);
            const verifyButton = new discord_js_1.ButtonBuilder()
                .setCustomId('kraxx_verify')
                .setLabel('VERIFY')
                .setStyle(discord_js_1.ButtonStyle.Success);
            const row = new discord_js_1.ActionRowBuilder().addComponents(verifyButton);
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Setup Published', `Verification panel dispatched to <#${targetChannel.id}>.`)],
                ephemeral: true,
            });
        }
    },
};
