import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { SayService } from '../../services/say.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('sayreply')
    .setDescription('Send a reply to a message as KRAXX Bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt => opt.setName('message_id').setDescription('ID of the message to reply to').setRequired(true))
    .addStringOption(opt => opt.setName('content').setDescription('Reply message content').setRequired(true)),

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

    const messageId = interaction.options.getString('message_id', true);
    const content = interaction.options.getString('content', true);

    await SayService.replySay(interaction, messageId, content);
  },
};
