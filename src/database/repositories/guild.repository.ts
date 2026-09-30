import { prisma } from '../client';
import { Guild, GuildSettings, GuildModule } from '@prisma/client';
import { MODULE_CATALOG, assertModuleKey, getModuleState, ModuleOperationalState } from '../../config/modules';
import { settingsContract } from '../../config/settings';

export const GuildRepository = {
  /**
   * Upserts a Guild record and ensures default GuildSettings and GuildModules exist.
   * Safe to call on every bot ready event or guildCreate.
   */
  async upsertGuild(data: {
    id: string;
    name: string;
    icon: string | null;
    ownerId: string;
    memberCount?: number | null;
  }): Promise<Guild> {
    const now = new Date();
    const guild = await prisma.guild.upsert({
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
    await prisma.guildSettings.upsert({
      where: { guildId: data.id },
      update: {},
      create: { guildId: data.id },
    });

    // Ensure all default GuildModule rows exist
    for (const { key: module } of MODULE_CATALOG) {
      await prisma.guildModule.upsert({
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
  async markBotRemoved(guildId: string): Promise<void> {
    const now = new Date();
    await prisma.guild.updateMany({
      where: { id: guildId },
      data: { botInstalled: false, connectionStatus: 'LEFT', leftAt: now, lastSeenAt: now },
    });
  },

  /** Records a transient Gateway outage without treating it as an uninstall. */
  async markGuildUnavailable(guildId: string): Promise<void> {
    await prisma.guild.updateMany({
      where: { id: guildId, botInstalled: true },
      data: { connectionStatus: 'UNAVAILABLE' },
    });
  },

  /** After Gateway READY, records missing cached guilds as unavailable, never as removed. */
  async markMissingGatewayGuildsUnavailable(guildIds: string[]): Promise<void> {
    await prisma.guild.updateMany({
      where: guildIds.length ? { botInstalled: true, id: { notIn: guildIds } } : { botInstalled: true },
      data: { connectionStatus: 'UNAVAILABLE' },
    });
  },

  /**
   * Fetches a guild with its settings.
   */
  async findById(guildId: string) {
    return prisma.guild.findUnique({
      where: { id: guildId },
      include: { settings: true, welcomeConfig: true },
    });
  },

  /**
   * Returns all guilds where the bot is currently installed.
   */
  async findAllInstalled(): Promise<Guild[]> {
    return prisma.guild.findMany({
      where: { botInstalled: true },
      orderBy: { joinedAt: 'asc' },
    });
  },

  /**
   * Returns module config for a specific guild + module combination.
   */
  async getModule(guildId: string, module: string): Promise<GuildModule | null> {
    assertModuleKey(module);
    return prisma.guildModule.findUnique({
      where: { guildId_module: { guildId, module } },
    });
  },

  /** Resolves the canonical operational state from the catalog and persisted guild setting. */
  async getModuleOperationalState(guildId: string, module: string): Promise<ModuleOperationalState> {
    const record = await GuildRepository.getModule(guildId, module);
    return getModuleState(module, record?.enabled);
  },

  /**
   * Checks if a module is enabled for a guild. Defaults to true if not configured.
   */
  async isModuleEnabled(guildId: string, module: string): Promise<boolean> {
    assertModuleKey(module);
    const mod = await GuildRepository.getModule(guildId, module);
    return mod?.enabled ?? true;
  },

  /**
   * Updates GuildSettings for a given guild.
   */
  async updateSettings(
    guildId: string,
    data: Partial<Omit<GuildSettings, 'id' | 'guildId' | 'updatedAt'>>
  ): Promise<GuildSettings> {
    return prisma.guildSettings.update({
      where: { guildId },
      data: settingsContract.parse(data),
    });
  },
};
