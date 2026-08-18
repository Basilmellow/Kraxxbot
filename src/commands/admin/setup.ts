import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Publish system embeds and interactive panels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('welcome-embed')
        .setDescription('Publish official KRAXX HQ Welcome panel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('verify-embed')
        .setDescription('Publish official KRAXX HQ Verification panel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as any;
    const auth = PermissionsService.requireManagement(member);

    if (!auth.authorized) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;

    if (!targetChannel.isTextBased()) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Invalid Channel', 'Target channel must be a text channel.')],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'welcome-embed') {
      const embed = KraxxEmbedBuilder.welcome();
      const verifyButton = new ButtonBuilder()
        .setCustomId('kraxx_verify')
        .setLabel('VERIFY')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyButton);

      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.success('Setup Published', `Welcome panel dispatched to <#${targetChannel.id}>.`)],
        ephemeral: true,
      });
    } else if (subcommand === 'verify-embed') {
      const embed = KraxxEmbedBuilder.verification();
      const verifyButton = new ButtonBuilder()
        .setCustomId('kraxx_verify')
        .setLabel('VERIFY')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyButton);

      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.success('Setup Published', `Verification panel dispatched to <#${targetChannel.id}>.`)],
        ephemeral: true,
      });
    }
  },
};
