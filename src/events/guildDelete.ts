import { Guild as DiscordGuild } from 'discord.js';
import { logger } from '../utils/logger';
import { GuildRepository } from '../database/repositories/guild.repository';

/**
 * Fired when KRAXXBot is removed from a Discord server (kicked or banned).
 * Marks the guild's botInstalled flag as false — preserves historical data.
 */
export async function onGuildDelete(guild: DiscordGuild): Promise<void> {
  // Discord fires guildDelete for unavailable guilds during outages too.
  // guild.available === false means it's an outage, not a removal — skip it.
  if (!guild.available) {
    logger.warn({ guildId: guild.id }, '⚠️ Guild became unavailable (outage) — skipping guildDelete handler');
    return;
  }

  logger.info({ guildId: guild.id, guildName: guild.name }, '🔴 Bot removed from guild — marking as uninstalled');

  try {
    await GuildRepository.markBotRemoved(guild.id);
    logger.info({ guildId: guild.id }, '✅ Guild marked as bot uninstalled (data preserved)');
  } catch (error) {
    logger.error({ err: error, guildId: guild.id }, '❌ Failed to mark guild as uninstalled');
  }
}
