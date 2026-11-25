"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildRepository = void 0;
const client_1 = require("../client");
const modules_1 = require("../../config/modules");
const settings_1 = require("../../config/settings");
exports.GuildRepository = {
    /**
     * Upserts a Guild record and ensures default GuildSettings and GuildModules exist.
     * Safe to call on every bot ready event or guildCreate.
     */
    async upsertGuild(data) {
        const now = new Date();
        const guild = await client_1.prisma.guild.upsert({
            where: { id: data.id },
            update: {
                name: data.name,
                icon: data.icon,
                ownerId: data.ownerId,
                botInstalled: true,
                memberCount: data.memberCount ?? undefined,
                lastSeenAt: now,
                connectionStatus: 'CONNECTED',
                leftAt: null,
            },
            create: {
                id: data.id,
                name: data.name,
                icon: data.icon,
                ownerId: data.ownerId,
                botInstalled: true,
                memberCount: data.memberCount ?? null,
                lastSeenAt: now,
                connectionStatus: 'CONNECTED',
            },
        });
        // Ensure GuildSettings row exists
        await client_1.prisma.guildSettings.upsert({
            where: { guildId: data.id },
            update: {},
            create: { guildId: data.id },
        });
        // Ensure all default GuildModule rows exist
        for (const { key: module } of modules_1.MODULE_CATALOG) {
            await client_1.prisma.guildModule.upsert({
                where: { guildId_module: { guildId: data.id, module } },
                update: {},
                create: { guildId: data.id, module, enabled: module !== 'kraxx-ai' },
            });
        }
        return guild;
    },
    /**
     * Marks a guild as having the bot removed (botInstalled = false).
     */
    async markBotRemoved(guildId) {
        const now = new Date();
        await client_1.prisma.guild.updateMany({
            where: { id: guildId },
            data: { botInstalled: false, connectionStatus: 'LEFT', leftAt: now, lastSeenAt: now },
        });
    },
    /** Records a transient Gateway outage without treating it as an uninstall. */
    async markGuildUnavailable(guildId) {
        await client_1.prisma.guild.updateMany({
            where: { id: guildId, botInstalled: true },
            data: { connectionStatus: 'UNAVAILABLE' },
        });
    },
    /** After Gateway READY, records missing cached guilds as unavailable, never as removed. */
    async markMissingGatewayGuildsUnavailable(guildIds) {
        await client_1.prisma.guild.updateMany({
            where: guildIds.length ? { botInstalled: true, id: { notIn: guildIds } } : { botInstalled: true },
            data: { connectionStatus: 'UNAVAILABLE' },
        });
    },
    /**
     * Fetches a guild with its settings.
     */
    async findById(guildId) {
        return client_1.prisma.guild.findUnique({
            where: { id: guildId },
            include: { settings: true, welcomeConfig: true },
        });
    },
    /**
     * Returns all guilds where the bot is currently installed.
     */
    async findAllInstalled() {
        return client_1.prisma.guild.findMany({
            where: { botInstalled: true },
            orderBy: { joinedAt: 'asc' },
        });
    },
    /**
     * Returns module config for a specific guild + module combination.
     */
    async getModule(guildId, module) {
        (0, modules_1.assertModuleKey)(module);
        return client_1.prisma.guildModule.findUnique({
            where: { guildId_module: { guildId, module } },
        });
    },
    /** Resolves the canonical operational state from the catalog and persisted guild setting. */
    async getModuleOperationalState(guildId, module) {
        const record = await exports.GuildRepository.getModule(guildId, module);
        return (0, modules_1.getModuleState)(module, record?.enabled);
    },
    /**
     * Checks if a module is enabled for a guild. Defaults to true if not configured.
     */
    async isModuleEnabled(guildId, module) {
        (0, modules_1.assertModuleKey)(module);
        const mod = await exports.GuildRepository.getModule(guildId, module);
        return mod?.enabled ?? true;
    },
    /**
     * Updates GuildSettings for a given guild.
     */
    async updateSettings(guildId, data) {
        return client_1.prisma.guildSettings.update({
            where: { guildId },
            data: settings_1.settingsContract.parse(data),
        });
    },
};
