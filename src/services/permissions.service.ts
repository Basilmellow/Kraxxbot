import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { GuildSettings } from '@prisma/client';

export class PermissionsService {
  /**
   * Checks if a member has administrator privileges in their guild.
   */
  static isGuildAdmin(member: GuildMember, settings?: GuildSettings | null): boolean {
    if (!member) return false;
    if (member.id === member.guild.ownerId) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId)) return true;
    return false;
  }

  /**
   * Checks if a member can manage server operations (Manage Guild or Admin).
   */
  static isGuildManager(member: GuildMember, settings?: GuildSettings | null): boolean {
    if (this.isGuildAdmin(member, settings)) return true;
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    return false;
  }

  /**
   * Checks if a member can moderate the guild (moderate/kick/ban/manage messages).
   */
  static isModerator(member: GuildMember, settings?: GuildSettings | null): boolean {
    if (this.isGuildManager(member, settings)) return true;
    if (
      member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      member.permissions.has(PermissionFlagsBits.KickMembers) ||
      member.permissions.has(PermissionFlagsBits.BanMembers) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages)
    ) {
      return true;
    }
    if (settings?.modRoleId && member.roles.cache.has(settings.modRoleId)) return true;
    return false;
  }

  /**
   * Checks if a member can manage or support tickets.
   */
  static isTicketSupport(member: GuildMember, settings?: GuildSettings | null): boolean {
    if (this.isModerator(member, settings)) return true;
    if (
      (settings?.supportRoleId && member.roles.cache.has(settings.supportRoleId)) ||
      (settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId))
    ) {
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Authorization Guards for Command Execution
  // ─────────────────────────────────────────────────────────────────

  static requireAdmin(
    member: GuildMember,
    settings?: GuildSettings | null
  ): { authorized: boolean; reason?: string } {
    if (!this.isGuildAdmin(member, settings)) {
      return {
        authorized: false,
        reason: 'This operation requires Server Administrator permission.',
      };
    }
    return { authorized: true };
  }

  static requireManager(
    member: GuildMember,
    settings?: GuildSettings | null
  ): { authorized: boolean; reason?: string } {
    if (!this.isGuildManager(member, settings)) {
      return {
        authorized: false,
        reason: 'This operation requires Manage Server (or Administrator) permission.',
      };
    }
    return { authorized: true };
  }

  static requireModerator(
    member: GuildMember,
    settings?: GuildSettings | null
  ): { authorized: boolean; reason?: string } {
    if (!this.isModerator(member, settings)) {
      return {
        authorized: false,
        reason: 'This operation requires Server Moderator permission.',
      };
    }
    return { authorized: true };
  }

  static requireTicketSupport(
    member: GuildMember,
    settings?: GuildSettings | null
  ): { authorized: boolean; reason?: string } {
    if (!this.isTicketSupport(member, settings)) {
      return {
        authorized: false,
        reason: 'This action is restricted to Server Staff & Support.',
      };
    }
    return { authorized: true };
  }

  // Compatible aliases for existing command routes
  static requireManagement(
    member: GuildMember,
    settings?: GuildSettings | null
  ): { authorized: boolean; reason?: string } {
    return this.requireManager(member, settings);
  }

  static requireTeamLead(
    member: GuildMember,
    settings?: GuildSettings | null
  ): { authorized: boolean; reason?: string } {
    return this.requireModerator(member, settings);
  }

  static requireTicketManager(
    member: GuildMember,
    settings?: GuildSettings | null
  ): { authorized: boolean; reason?: string } {
    return this.requireTicketSupport(member, settings);
  }
}
