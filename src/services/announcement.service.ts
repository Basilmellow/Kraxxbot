import { ModalSubmitInteraction, TextChannel, GuildMember } from 'discord.js';
import { AnnouncementRepository } from '../database/repositories/announcement.repository';
import { GuildRepository } from '../database/repositories/guild.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class AnnouncementService {
  /**
   * Dispatches a corporate announcement submitted via modal interaction.
   * Resolves the target channel from GuildSettings.announcementsChannelId (if set),
   * otherwise falls back to the first available text channel.
   */
  static async handleAnnouncementSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const member = interaction.member as GuildMember | null;

    if (!member || !interaction.guild) {
      const errEmbed = KraxxEmbedBuilder.error('Unauthorized', 'Member and guild context required.');
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    const guildId = interaction.guildId!;
    const title = interaction.fields.getTextInputValue('title');
    const message = interaction.fields.getTextInputValue('message');
    const departmentInput = (interaction.fields.getTextInputValue('department') || 'GENERAL').toUpperCase().trim();
    const typeInput = (interaction.fields.getTextInputValue('type') || 'GENERAL').toUpperCase().trim();
    const mentionRole = interaction.fields.getTextInputValue('mention_role')?.trim();
    const imageUrl = interaction.fields.getTextInputValue('image_url')?.trim();

    // Resolve target channel from GuildSettings
    let targetChannelId: string | null = null;
    try {
      const guild = await GuildRepository.findById(guildId);
      if (guild?.settings?.announcementChannelId) {
        targetChannelId = guild.settings.announcementChannelId;
      }
    } catch (err) {
      logger.warn({ err, guildId }, 'Could not resolve GuildSettings for announcement channel');
    }

    if (!targetChannelId) {
      const errEmbed = KraxxEmbedBuilder.error(
        'Channel Not Configured',
        'No announcements channel is configured for this server. Please configure it in the dashboard.'
      );
      await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      return;
    }

    const targetChannel = interaction.guild.channels.cache.get(targetChannelId) as TextChannel | undefined;

    if (!targetChannel || !targetChannel.isTextBased()) {
      const errEmbed = KraxxEmbedBuilder.error('Channel Error', `Configured announcements channel (${targetChannelId}) not found in server.`);
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
        guildId,
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
