"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onGuildCreate = onGuildCreate;
exports.onGuildAvailable = onGuildAvailable;
const logger_1 = require("../utils/logger");
const guild_repository_1 = require("../database/repositories/guild.repository");
/**
 * Fired when KRAXXBot is added to a new Discord server.
 * Initializes the Guild record, default GuildSettings, and all GuildModules.
 */
async function onGuildCreate(guild) {
    logger_1.logger.info({ guildId: guild.id, guildName: guild.name }, '🟢 Bot added to new guild — initializing...');
    try {
        await guild_repository_1.GuildRepository.upsertGuild({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            ownerId: guild.ownerId,
            memberCount: guild.memberCount,
        });
        logger_1.logger.info({ guildId: guild.id, guildName: guild.name }, '✅ Guild initialized with default settings and modules');
    }
    catch (error) {
        logger_1.logger.error({ err: error, guildId: guild.id }, '❌ Failed to initialize guild on join');
    }
}
async function onGuildAvailable(guild) {
    try {
        await guild_repository_1.GuildRepository.upsertGuild({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            ownerId: guild.ownerId,
            memberCount: guild.memberCount,
        });
        logger_1.logger.info({ guildId: guild.id }, '✅ Guild became available and registry metadata was refreshed');
    }
    catch (error) {
        logger_1.logger.error({ err: error, guildId: guild.id }, '❌ Failed to refresh available guild metadata');
    }
}
