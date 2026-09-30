import { Guild,TextChannel } from 'discord.js';
import { AuditRepository } from '../database/repositories/audit.repository';
import { GuildRepository } from '../database/repositories/guild.repository';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';
import { assertAuditTenant, createAuditDetails } from './audit-event';

export class AuditService {
  /**
   * Records an audit event in the database and dispatches an audit embed to the guild's log channel.
   */
  static async logEvent(
    guild: Guild | null,
    action: string,
    executorId: string,
    targetId?: string,
    details?: string,
    outcome: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
    persist = true,
  ): Promise<void> {
    if (!guild) return;
    assertAuditTenant({ guildId: guild.id, actorId: executorId });

    try {
      // 1. Record in Database
      if (persist) {
        await AuditRepository.create({
          guildId: guild.id,
          action,
          executorId,
          targetId: targetId ?? undefined,
          details: createAuditDetails({ outcome, source: 'BOT', targetType: null, metadata: details }),
        });
      }

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
      logger.error({ action, executorId, guildId: guild.id }, persist ? 'AUDIT_WRITE_FAILED' : 'AUDIT_NOTIFICATION_FAILED');
      throw new Error(persist ? 'Audit persistence failed.' : 'Audit notification failed.');
    }
  }
}
