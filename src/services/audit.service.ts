import { Guild, TextChannel } from 'discord.js';
import { AuditRepository } from '../database/repositories/audit.repository';
import { env } from '../config/environment';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class AuditService {
  /**
   * Records an operational audit event in the database and dispatches an audit embed to #bot-logs.
   */
  static async logEvent(
    guild: Guild | null,
    action: string,
    executorId: string,
    targetId?: string,
    details?: string
  ): Promise<void> {
    try {
      // 1. Record in Database
      await AuditRepository.create({
        action,
        executorId,
        targetId,
        details,
      });

      // 2. Dispatch to Discord Log Channel if configured and guild is present
      if (guild && env.BOT_LOG_CHANNEL_ID) {
        const logChannel = guild.channels.cache.get(env.BOT_LOG_CHANNEL_ID) as TextChannel | undefined;
        if (logChannel && logChannel.isTextBased()) {
          const executorMention = `<@${executorId}>`;
          const targetMention = targetId ? `<@${targetId}>` : undefined;
          const embed = KraxxEmbedBuilder.audit(action, executorMention, details, targetMention);
          await logChannel.send({ embeds: [embed] }).catch(err => {
            logger.warn({ err }, 'Failed to dispatch audit embed to #bot-logs');
          });
        }
      }
    } catch (error) {
      logger.error({ err: error, action, executorId }, 'Audit logging failed');
    }
  }
}
