import { GuildMember, PermissionFlagsBits, Role } from 'discord.js';
import { GuildSettings } from '@prisma/client';

export enum PermissionTier {
  ADMINISTRATOR = 100,
  MANAGER = 80,
  MODERATOR = 60,
  SUPPORT = 40,
  MEMBER = 10,
  NONE = 0,
}

/**
 * Resolves the member's permission tier in the active guild.
 * Checks native Discord permissions first, then configured GuildSettings role IDs.
 */
export function getMemberPermissionTier(
  member: GuildMember,
  settings?: GuildSettings | null
): PermissionTier {
  if (!member) return PermissionTier.NONE;

  // Server Owner or Administrator permission
  if (
    member.id === member.guild.ownerId ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return PermissionTier.ADMINISTRATOR;
  }

  // Manage Guild permission or configured Admin role
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return PermissionTier.MANAGER;
  }
  if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId)) {
    return PermissionTier.ADMINISTRATOR;
  }

  // Moderation permissions or configured Mod role
  if (
    member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    member.permissions.has(PermissionFlagsBits.BanMembers) ||
    member.permissions.has(PermissionFlagsBits.KickMembers) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages)
  ) {
    return PermissionTier.MODERATOR;
  }
  if (settings?.modRoleId && member.roles.cache.has(settings.modRoleId)) {
    return PermissionTier.MODERATOR;
  }

  // Support or staff role configured in GuildSettings
  if (
    (settings?.supportRoleId && member.roles.cache.has(settings.supportRoleId)) ||
    (settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId))
  ) {
    return PermissionTier.SUPPORT;
  }

  return PermissionTier.MEMBER;
}

/**
 * Checks whether a member has ticket manager / support privileges in the guild.
 */
export function isTicketManager(
  member: GuildMember,
  settings?: GuildSettings | null
): boolean {
  return getMemberPermissionTier(member, settings) >= PermissionTier.SUPPORT;
}

/**
 * Checks whether an executor can assign or manage a target role based on Discord hierarchy.
 */
export function canManageDiscordRole(
  executor: GuildMember,
  targetRole: Role
): { allowed: boolean; reason?: string } {
  // Guild owner can manage any role below the bot
  if (executor.id === executor.guild.ownerId) {
    return { allowed: true };
  }

  // Discord hierarchy check: executor's highest role must be above the target role
  if (executor.roles.highest.position <= targetRole.position) {
    return {
      allowed: false,
      reason: `You cannot manage the role <@&${targetRole.id}> because it is positioned equal to or higher than your highest role.`,
    };
  }

  // Bot hierarchy check: bot's highest role must be above the target role
  const botMember = executor.guild.members.me;
  if (botMember && botMember.roles.highest.position <= targetRole.position) {
    return {
      allowed: false,
      reason: `KRAXXBot cannot manage <@&${targetRole.id}> because the role is higher than KRAXXBot's highest role in server hierarchy.`,
    };
  }

  return { allowed: true };
}
