import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { GuildSettings } from '@prisma/client';
import { isManagement, isTicketManager, isTeamLeadOrAbove, getMemberHighestTier, RoleTier } from '../config/roles';

export class PermissionsService {
  // ─────────────────────────────────────────────────────────
  // Multi-Tenant Guild Permission Checks
  // ─────────────────────────────────────────────────────────

  /**
   * Checks if a member can administer the guild (server manager / admin).
   * Works across ALL guilds via Discord-native permissions.
   */
  static isGuildAdmin(member: GuildMember): boolean {
    return (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild)
    );
  }

  /**
   * Checks if a member can moderate in a given guild.
   * Checks Discord permissions first, then falls back to configured GuildSettings roles.
   */
  static isModerator(member: GuildMember, settings?: GuildSettings | null): boolean {
    if (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.KickMembers)
    ) {
      return true;
    }

    if (settings) {
      const roles = [settings.adminRoleId, settings.modRoleId].filter(Boolean) as string[];
      return roles.some(roleId => member.roles.cache.has(roleId));
    }

    return false;
  }

  /**
   * Checks if a member can manage support tickets in a given guild.
   * Checks Discord permissions first, then support/staff roles from GuildSettings.
   */
  static isTicketSupport(member: GuildMember, settings?: GuildSettings | null): boolean {
    if (PermissionsService.isModerator(member, settings)) return true;

    if (settings) {
      const roles = [settings.supportRoleId, settings.staffRoleId].filter(Boolean) as string[];
      return roles.some(roleId => member.roles.cache.has(roleId));
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────
  // Legacy KRAXX HQ Role Checks (for KRAXX HQ guild only)
  // These still work for HQ but should not be used in other guilds.
  // ─────────────────────────────────────────────────────────

  static requireTicketManager(member: GuildMember): { authorized: boolean; reason?: string } {
    if (!isTicketManager(member)) {
      return {
        authorized: false,
        reason: 'This action is restricted to KRAXX Management (Founder, Co-Founder, Management Head).',
      };
    }
    return { authorized: true };
  }

  static requireManagement(member: GuildMember): { authorized: boolean; reason?: string } {
    if (!isManagement(member)) {
      return {
        authorized: false,
        reason: 'This operation requires Management Head, Co-Founder, or Founder authorization.',
      };
    }
    return { authorized: true };
  }

  static requireTeamLead(member: GuildMember): { authorized: boolean; reason?: string } {
    if (!isTeamLeadOrAbove(member)) {
      return {
        authorized: false,
        reason: 'This operation requires Team Lead level authorization or higher.',
      };
    }
    return { authorized: true };
  }

  static requireTier(member: GuildMember, minTier: RoleTier): { authorized: boolean; reason?: string } {
    const tier = getMemberHighestTier(member);
    if (tier < minTier) {
      return {
        authorized: false,
        reason: `Insufficient authority. Required tier: ${minTier}, your tier: ${tier}.`,
      };
    }
    return { authorized: true };
  }
}
