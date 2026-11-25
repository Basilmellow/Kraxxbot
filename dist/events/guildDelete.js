"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onGuildDelete = onGuildDelete;
const logger_1 = require("../utils/logger");
const guild_repository_1 = require("../database/repositories/guild.repository");
/**
 * Fired when KRAXXBot is removed from a Discord server (kicked or banned).
 * Marks the guild's botInstalled flag as false — preserves historical data.
 */
async function onGuildDelete(guild) {
    // Discord fires guildDelete for unavailable guilds during outages too.
    // guild.available === false means it's an outage, not a removal — skip it.
    if (!guild.available) {
        try {
            await guild_repository_1.GuildRepository.markGuildUnavailable(guild.id);
        }
        catch (error) {
            logger_1.logger.error({ err: error, guildId: guild.id }, '❌ Failed to mark unavailable guild');
        }
        logger_1.logger.warn({ guildId: guild.id }, '⚠️ Guild became unavailable (outage) — skipping guildDelete handler');
        return;
    }
    logger_1.logger.info({ guildId: guild.id, guildName: guild.name }, '🔴 Bot removed from guild — marking as uninstalled');
    try {
        await guild_repository_1.GuildRepository.markBotRemoved(guild.id);
        logger_1.logger.info({ guildId: guild.id }, '✅ Guild marked as bot uninstalled (data preserved)');
    }
    catch (error) {
        logger_1.logger.error({ err: error, guildId: guild.id }, '❌ Failed to mark guild as uninstalled');
    }
}
