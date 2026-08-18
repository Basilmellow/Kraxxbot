import { ModalSubmitInteraction, TextChannel, GuildMember } from 'discord.js';
import { AnnouncementRepository } from '../database/repositories/announcement.repository';
import { AuditService } from './audit.service';
import { env } from '../config/environment';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class AnnouncementService {
  /**
   * Dispatches a corporate announcement submitted via modal interaction.
   */
  static async handleAnnouncementSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const member = interaction.member as GuildMember | null;

    if (!member) {
      const errEmbed = KraxxEmbedBuilder.error('Unauthorized', 'Member context required.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    const title = interaction.fields.getTextInputValue('title');
    const message = interaction.fields.getTextInputValue('message');
    const departmentInput = (interaction.fields.getTextInputValue('department') || 'GENERAL').toUpperCase().trim();
    const typeInput = (interaction.fields.getTextInputValue('type') || 'GENERAL').toUpperCase().trim();
    const mentionRole = interaction.fields.getTextInputValue('mention_role')?.trim();
    const imageUrl = interaction.fields.getTextInputValue('image_url')?.trim();

    // Map department to targeted channel ID
    let targetChannelId = env.ANNOUNCEMENTS_CHANNEL_ID;

    if (departmentInput === 'KRAXXSEC' && env.SEC_ANNOUNCEMENTS_CHANNEL_ID) {
      targetChannelId = env.SEC_ANNOUNCEMENTS_CHANNEL_ID;
    } else if (departmentInput === 'KRAXX_STUDIO' && env.STUDIO_ANNOUNCEMENTS_CHANNEL_ID) {
      targetChannelId = env.STUDIO_ANNOUNCEMENTS_CHANNEL_ID;
    }

    if (!targetChannelId || targetChannelId.trim().length === 0) {
      targetChannelId = env.ANNOUNCEMENTS_CHANNEL_ID;
    }

    if (!interaction.guild || !targetChannelId) {
      const errEmbed = KraxxEmbedBuilder.error('Channel Error', 'Target announcement channel is not configured.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    const targetChannel = interaction.guild.channels.cache.get(targetChannelId) as TextChannel | undefined;

    if (!targetChannel || !targetChannel.isTextBased()) {
      const errEmbed = KraxxEmbedBuilder.error('Channel Error', `Channel ID (${targetChannelId}) not found in server.`);
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    try {
      const embed = KraxxEmbedBuilder.announcement(
        title,
        message,
        departmentInput,
        typeInput,
        member.displayName,
        imageUrl || undefined
      );

      let contentPayload: string | undefined = undefined;
      if (mentionRole) {
        if (mentionRole.toLowerCase() === 'everyone') {
          contentPayload = '@everyone';
        } else if (mentionRole.toLowerCase() === 'here') {
          contentPayload = '@here';
        } else if (/^\d+$/.test(mentionRole)) {
          contentPayload = `<@&${mentionRole}>`;
        }
      }

      const dispatchedMessage = await targetChannel.send({
        content: contentPayload,
        embeds: [embed],
      });

      // Save database record
      await AnnouncementRepository.create({
        title,
        content: message,
        department: departmentInput,
        type: typeInput,
        authorId: member.id,
        channelId: targetChannel.id,
        messageId: dispatchedMessage.id,
        mentionRole,
        imageUrl,
      });

      // Send ephemeral success confirmation to author
      const confirmEmbed = KraxxEmbedBuilder.success(
        'Announcement Dispatched',
        `Announcement **"${title}"** successfully published to <#${targetChannel.id}>.`
      );
      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

      // Audit Log
      await AuditService.logEvent(
        interaction.guild,
        'ANNOUNCEMENT_PUBLISHED',
        member.id,
        targetChannel.id,
        `Title: ${title} | Division: ${departmentInput} | Type: ${typeInput}`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to process announcement');
      const errEmbed = KraxxEmbedBuilder.error('Publication Error', 'Failed to dispatch announcement.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
  }
}
