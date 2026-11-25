"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Display KRAXX Bot operational latency & system status'),
    async execute(interaction) {
        await interaction.reply({
            embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('Measuring Latency...', 'SYSTEM STATUS')],
            ephemeral: true,
        });
        const sent = await interaction.fetchReply();
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = interaction.client.ws.ping;
        const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('KRAXX SYSTEM STATUS', 'OPERATIONAL');
        embed.addFields({ name: 'Gateway Latency', value: `\`${wsLatency}ms\``, inline: true }, { name: 'REST Roundtrip', value: `\`${roundtrip}ms\``, inline: true }, { name: 'Environment', value: `\`${process.env.NODE_ENV || 'development'}\``, inline: true }, { name: 'Uptime', value: `<t:${Math.floor((Date.now() - (interaction.client.uptime || 0)) / 1000)}:R>`, inline: true });
        await interaction.editReply({ embeds: [embed] });
    },
};
