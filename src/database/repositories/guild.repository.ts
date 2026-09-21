import { prisma } from '../client';
import { Guild, GuildSettings, GuildModule } from '@prisma/client';

const DEFAULT_MODULES = [
  'tickets',
  'moderation',
  'welcome',
  'tasks',
  'reminders',
  'meetings',
  'embeds',
  'automation',
  'analytics',
  'logging',
  'announcements',
  'roles',
];

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
  }): Promise<Guild> {
    const guild = await prisma.guild.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
        botInstalled: true,
      },
      create: {
        id: data.id,
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
        botInstalled: true,
      },
    });

    // Ensure GuildSettings row exists
    await prisma.guildSettings.upsert({
      where: { guildId: data.id },
      update: {},
      create: { guildId: data.id },
    });

    // Ensure all default GuildModule rows exist
    for (const module of DEFAULT_MODULES) {
      await prisma.guildModule.upsert({
        where: { guildId_module: { guildId: data.id, module } },
        update: {},
        create: { guildId: data.id, module, enabled: true },
      });
    }

    return guild;
  },

  /**
   * Marks a guild as having the bot removed (botInstalled = false).
   */
  async markBotRemoved(guildId: string): Promise<void> {
    await prisma.guild.updateMany({
      where: { id: guildId },
      data: { botInstalled: false },
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
    return prisma.guildModule.findUnique({
      where: { guildId_module: { guildId, module } },
    });
  },

  /**
   * Checks if a module is enabled for a guild. Defaults to true if not configured.
   */
  async isModuleEnabled(guildId: string, module: string): Promise<boolean> {
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
      data,
    });
  },
};
