"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const audit_repository_1 = require("../database/repositories/audit.repository");
const guild_repository_1 = require("../database/repositories/guild.repository");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
const audit_event_1 = require("./audit-event");
class AuditService {
    /**
     * Records an audit event in the database and dispatches an audit embed to the guild's log channel.
     */
    static async logEvent(guild, action, executorId, targetId, details, outcome = 'SUCCESS', persist = true) {
        if (!guild)
            return;
        (0, audit_event_1.assertAuditTenant)({ guildId: guild.id, actorId: executorId });
        try {
            // 1. Record in Database
            if (persist) {
                await audit_repository_1.AuditRepository.create({
                    guildId: guild.id,
                    action,
                    executorId,
                    targetId: targetId ?? undefined,
                    details: (0, audit_event_1.createAuditDetails)({ outcome, source: 'BOT', targetType: null, metadata: details }),
                });
            }
            // 2. Dispatch to Guild's configured log channel
            const guildData = await guild_repository_1.GuildRepository.findById(guild.id);
            const logChannelId = guildData?.settings?.logChannelId || guildData?.settings?.modLogChannelId;
            if (logChannelId) {
                const logChannel = guild.channels.cache.get(logChannelId);
                if (logChannel && logChannel.isTextBased()) {
                    const executorMention = `<@${executorId}>`;
                    const targetMention = targetId ? `<@${targetId}>` : undefined;
                    const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.audit(action, executorMention, details, targetMention);
                    await logChannel.send({ embeds: [embed] }).catch(err => {
                        logger_1.logger.warn({ err, guildId: guild.id }, 'Failed to dispatch audit embed to log channel');
                    });
                }
            }
        }
        catch (error) {
            logger_1.logger.error({ action, executorId, guildId: guild.id }, persist ? 'AUDIT_WRITE_FAILED' : 'AUDIT_NOTIFICATION_FAILED');
            throw new Error(persist ? 'Audit persistence failed.' : 'Audit notification failed.');
        }
    }
}
exports.AuditService = AuditService;
