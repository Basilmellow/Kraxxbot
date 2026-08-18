import { SlashCommandBuilder, ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Publish a corporate announcement (Opens Modal Interface)'),

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

    const modal = new ModalBuilder()
      .setCustomId('kraxx_announce_modal')
      .setTitle('Publish KRAXX Announcement');

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Announcement Title')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter concise headline title...')
      .setRequired(true)
      .setMaxLength(100);

    const messageInput = new TextInputBuilder()
      .setCustomId('message')
      .setLabel('Announcement Message Body')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter full announcement details...')
      .setRequired(true)
      .setMaxLength(2000);

    const departmentInput = new TextInputBuilder()
      .setCustomId('department')
      .setLabel('Department (GENERAL / KRAXXSEC / KRAXX_STUDIO)')
      .setStyle(TextInputStyle.Short)
      .setValue('GENERAL')
      .setRequired(false);

    const typeInput = new TextInputBuilder()
      .setCustomId('type')
      .setLabel('Category (GENERAL/IMPORTANT/EVENT/MAINTENANCE)')
      .setStyle(TextInputStyle.Short)
      .setValue('GENERAL')
      .setRequired(false);

    const mentionInput = new TextInputBuilder()
      .setCustomId('mention_role')
      .setLabel('Role Mention (everyone / here / role_id)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(departmentInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(typeInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(mentionInput)
    );

    await interaction.showModal(modal);
  },
};
