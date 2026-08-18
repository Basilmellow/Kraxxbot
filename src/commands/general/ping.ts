import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Display KRAXX Bot operational latency & system status'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      embeds: [KraxxEmbedBuilder.createHeader('Measuring Latency...', 'SYSTEM STATUS')],
      ephemeral: true,
    });
    const sent = await interaction.fetchReply();

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    const embed = KraxxEmbedBuilder.createHeader('KRAXX SYSTEM STATUS', 'OPERATIONAL');
    embed.addFields(
      { name: 'Gateway Latency', value: `\`${wsLatency}ms\``, inline: true },
      { name: 'REST Roundtrip', value: `\`${roundtrip}ms\``, inline: true },
      { name: 'Environment', value: `\`${process.env.NODE_ENV || 'development'}\``, inline: true },
      { name: 'Uptime', value: `<t:${Math.floor((Date.now() - (interaction.client.uptime || 0)) / 1000)}:R>`, inline: true }
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
