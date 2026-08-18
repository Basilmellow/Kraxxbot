import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { SayService } from '../../services/say.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a raw text message as KRAXX Bot (supports multiline text & formatting)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt
        .setName('message')
        .setDescription('Text to send (leave empty to open a multiline text popup modal)')
        .setRequired(false)
    )
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Target text channel (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as any;
    const auth = PermissionsService.requireTeamLead(member);

    if (!auth.authorized) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Insufficient permissions.')],
        ephemeral: true,
      });
      return;
    }

    const message = interaction.options.getString('message');
    const targetChannel = interaction.options.getChannel('channel') as TextChannel | undefined;

    // If message text was provided directly in option, send immediately
    if (message && message.trim().length > 0) {
      await SayService.sendSay(interaction, message, targetChannel || undefined);
      return;
    }

    // Otherwise, open multiline paragraph Modal for comfortable pasting of long formatted text
    await SayService.openSayModal(interaction, targetChannel?.id);
  },
};
