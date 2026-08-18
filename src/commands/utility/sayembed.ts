import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { SayService } from '../../services/say.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('sayembed')
    .setDescription('Send a formatted rich embed message as KRAXX Bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Embed main description text').setRequired(true))
    .addStringOption(opt => opt.setName('color').setDescription('Optional Hex color code (e.g. #00F0FF)').setRequired(false))
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Target text channel')
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

    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const color = interaction.options.getString('color') || undefined;
    const targetChannel = interaction.options.getChannel('channel') as TextChannel | undefined;

    await SayService.sendSayEmbed(interaction, title, description, color, targetChannel || undefined);
  },
};
