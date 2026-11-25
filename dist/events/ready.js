"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReady = onReady;
const discord_js_1 = require("discord.js");
const logger_1 = require("../utils/logger");
const scheduler_service_1 = require("../services/scheduler.service");
const heartbeat_service_1 = require("../services/heartbeat.service");
const guild_repository_1 = require("../database/repositories/guild.repository");
const environment_1 = require("../config/environment");
async function onReady(client) {
    if (!client.user)
        return;
    logger_1.logger.info(`============================================================`);
    logger_1.logger.info(`🤖 KRAXX Discord Operations Bot Connected`);
    logger_1.logger.info(`Tag: ${client.user.tag} (ID: ${client.user.id})`);
    logger_1.logger.info(`Environment: ${environment_1.env.NODE_ENV}`);
    logger_1.logger.info(`Guilds: ${client.guilds.cache.size} servers`);
    logger_1.logger.info(`============================================================`);
    // 1. Sync all currently installed guilds into the database
    logger_1.logger.info('🔄 Syncing guild registry with database...');
    let synced = 0;
    let syncFailed = false;
    for (const [, guild] of client.guilds.cache) {
        try {
            await guild_repository_1.GuildRepository.upsertGuild({
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                ownerId: guild.ownerId,
                memberCount: guild.memberCount,
            });
            if (!guild.available)
                await guild_repository_1.GuildRepository.markGuildUnavailable(guild.id);
            synced++;
        }
        catch (error) {
            syncFailed = true;
            logger_1.logger.error({ err: error, guildId: guild.id }, 'Failed to sync guild on ready');
        }
    }
    if (!syncFailed) {
        try {
            await guild_repository_1.GuildRepository.markMissingGatewayGuildsUnavailable([...client.guilds.cache.keys()]);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to reconcile guilds missing from the ready Gateway cache');
        }
    }
    logger_1.logger.info(`✅ Guild sync complete: ${synced}/${client.guilds.cache.size} guilds registered`);
    // 2. Start background scheduler (tasks, reminders, meetings)
    scheduler_service_1.SchedulerService.start(client);
    // 3. Start real-time heartbeat telemetry
    heartbeat_service_1.HeartbeatService.start(client);
    // 4. Set bot presence
    client.user.setPresence({
        activities: [{ name: 'Custom Status', state: 'Secured by KRAXXSEC', type: discord_js_1.ActivityType.Custom }],
        status: 'online',
    });
}
