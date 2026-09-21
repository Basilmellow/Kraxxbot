import { Guild, TextChannel } from 'discord.js';
import { AuditRepository } from '../database/repositories/audit.repository';
import { GuildRepository } from '../database/repositories/guild.repository';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class AuditService {
  /**
   * Records an audit event in the database and dispatches an audit embed to the guild's log channel.
   */
  static async logEvent(
    guild: Guild | null,
    action: string,
    executorId: string,
    targetId?: string,
    details?: string
  ): Promise<void> {
    if (!guild) return;

    try {
      // 1. Record in Database
      await AuditRepository.create({
        guildId: guild.id,
        action,
        executorId,
        targetId,
        details,
      });

      // 2. Dispatch to Guild's configured log channel
      const guildData = await GuildRepository.findById(guild.id);
      const logChannelId = guildData?.settings?.logChannelId || guildData?.settings?.modLogChannelId;

      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
        if (logChannel && logChannel.isTextBased()) {
          const executorMention = `<@${executorId}>`;
          const targetMention = targetId ? `<@${targetId}>` : undefined;
          const embed = KraxxEmbedBuilder.audit(action, executorMention, details, targetMention);
          await logChannel.send({ embeds: [embed] }).catch(err => {
            logger.warn({ err, guildId: guild.id }, 'Failed to dispatch audit embed to log channel');
          });
        }
      }
    } catch (error) {
      logger.error({ err: error, action, executorId, guildId: guild.id }, 'Audit logging failed');
    }
  }
}
