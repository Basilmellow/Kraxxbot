import { Guild as DiscordGuild } from 'discord.js';
import { logger } from '../utils/logger';
import { GuildRepository } from '../database/repositories/guild.repository';

/**
 * Fired when KRAXXBot is added to a new Discord server.
 * Initializes the Guild record, default GuildSettings, and all GuildModules.
 */
export async function onGuildCreate(guild: DiscordGuild): Promise<void> {
  logger.info({ guildId: guild.id, guildName: guild.name }, '🟢 Bot added to new guild — initializing...');

  try {
    await GuildRepository.upsertGuild({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      ownerId: guild.ownerId,
    });

    logger.info(
      { guildId: guild.id, guildName: guild.name },
      '✅ Guild initialized with default settings and modules'
    );
  } catch (error) {
    logger.error({ err: error, guildId: guild.id }, '❌ Failed to initialize guild on join');
  }
}
