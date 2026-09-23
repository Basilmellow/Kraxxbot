// Durable guild registry reconciliation for dashboard-discovered installations.
// This mirrors the bot worker's GuildRepository initialization so a verified
// installation remains manageable even while the Gateway worker is offline.

import { prisma } from './prisma';
import type { DiscordGuild } from './discord';

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

/**
 * Registers a guild only after the caller has verified bot membership through
 * Discord. The record remains the durable home for tenant configuration; it is
 * not used as proof that the bot is currently installed.
 */
export async function reconcileInstalledGuild(guild: DiscordGuild) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.guild.upsert({
      where: { id: guild.id },
      update: {
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.owner_id,
        botInstalled: true,
      },
      create: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.owner_id,
        botInstalled: true,
      },
    });

    await tx.guildSettings.upsert({
      where: { guildId: guild.id },
      update: {},
      create: { guildId: guild.id },
    });

    await Promise.all(
      DEFAULT_MODULES.map((module) =>
        tx.guildModule.upsert({
          where: { guildId_module: { guildId: guild.id, module } },
          update: {},
          create: { guildId: guild.id, module, enabled: true },
        })
      )
    );

    return record;
  });
}
