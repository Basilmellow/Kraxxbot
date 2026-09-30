import { ActivityType, Client } from 'discord.js';
import { logger } from '../utils/logger';
import { SchedulerService } from '../services/scheduler.service';
import { HeartbeatService } from '../services/heartbeat.service';
import { GuildRepository } from '../database/repositories/guild.repository';
import { env } from '../config/environment';

export async function onReady(client: Client): Promise<void> {
  if (!client.user) return;

  logger.info(`============================================================`);
  logger.info(`🤖 KRAXX Discord Operations Bot Connected`);
  logger.info(`Tag: ${client.user.tag} (ID: ${client.user.id})`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Guilds: ${client.guilds.cache.size} servers`);
  logger.info(`============================================================`);

  // 1. Sync all currently installed guilds into the database
  logger.info('🔄 Syncing guild registry with database...');
  let synced = 0;
  let syncFailed = false;
  for (const [, guild] of client.guilds.cache) {
    try {
      await GuildRepository.upsertGuild({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
      });
      if (!guild.available) await GuildRepository.markGuildUnavailable(guild.id);
      synced++;
    } catch (error) {
      syncFailed = true;
      logger.error({ err: error, guildId: guild.id }, 'Failed to sync guild on ready');
    }
  }
  if (!syncFailed) {
    try {
      await GuildRepository.markMissingGatewayGuildsUnavailable([...client.guilds.cache.keys()]);
    } catch (error) {
      logger.error({ err: error }, 'Failed to reconcile guilds missing from the ready Gateway cache');
    }
  }
  logger.info(`✅ Guild sync complete: ${synced}/${client.guilds.cache.size} guilds registered`);

  // 2. Start background scheduler (tasks, reminders, meetings)
  SchedulerService.start(client);

  // 3. Start real-time heartbeat telemetry
  HeartbeatService.start(client);

  // 4. Set bot presence
  client.user.setPresence({
    activities: [{ name: 'Custom Status', state: 'Secured by KRAXXSEC', type: ActivityType.Custom }],
    status: 'online',
  });
}
