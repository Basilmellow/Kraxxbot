"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsService = void 0;
const discord_js_1 = require("discord.js");
class PermissionsService {
    /**
     * Checks if a member has administrator privileges in their guild.
     */
    static isGuildAdmin(member, settings) {
        if (!member)
            return false;
        if (member.id === member.guild.ownerId)
            return true;
        if (member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator))
            return true;
        if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId))
            return true;
        return false;
    }
    /**
     * Checks if a member can manage server operations (Manage Guild or Admin).
     */
    static isGuildManager(member, settings) {
        if (this.isGuildAdmin(member, settings))
            return true;
        if (member.permissions.has(discord_js_1.PermissionFlagsBits.ManageGuild))
            return true;
        return false;
    }
    /**
     * Checks if a member can moderate the guild (moderate/kick/ban/manage messages).
     */
    static isModerator(member, settings) {
        if (this.isGuildManager(member, settings))
            return true;
        if (member.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers) ||
            member.permissions.has(discord_js_1.PermissionFlagsBits.KickMembers) ||
            member.permissions.has(discord_js_1.PermissionFlagsBits.BanMembers) ||
            member.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages)) {
            return true;
        }
        if (settings?.modRoleId && member.roles.cache.has(settings.modRoleId))
            return true;
        return false;
    }
    /**
     * Checks if a member can manage or support tickets.
     */
    static isTicketSupport(member, settings) {
        if (this.isModerator(member, settings))
            return true;
        if ((settings?.supportRoleId && member.roles.cache.has(settings.supportRoleId)) ||
            (settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId))) {
            return true;
        }
        return false;
    }
    // ─────────────────────────────────────────────────────────────────
    // Authorization Guards for Command Execution
    // ─────────────────────────────────────────────────────────────────
    static requireAdmin(member, settings) {
        if (!this.isGuildAdmin(member, settings)) {
            return {
                authorized: false,
                reason: 'This operation requires Server Administrator permission.',
            };
        }
        return { authorized: true };
    }
    static requireManager(member, settings) {
        if (!this.isGuildManager(member, settings)) {
            return {
                authorized: false,
                reason: 'This operation requires Manage Server (or Administrator) permission.',
            };
        }
        return { authorized: true };
    }
    static requireModerator(member, settings) {
        if (!this.isModerator(member, settings)) {
            return {
                authorized: false,
                reason: 'This operation requires Server Moderator permission.',
            };
        }
        return { authorized: true };
    }
    static requireTicketSupport(member, settings) {
        if (!this.isTicketSupport(member, settings)) {
            return {
                authorized: false,
                reason: 'This action is restricted to Server Staff & Support.',
            };
        }
        return { authorized: true };
    }
    // Compatible aliases for existing command routes
    static requireManagement(member, settings) {
        return this.requireManager(member, settings);
    }
    static requireTeamLead(member, settings) {
        return this.requireModerator(member, settings);
    }
    static requireTicketManager(member, settings) {
        return this.requireTicketSupport(member, settings);
    }
}
exports.PermissionsService = PermissionsService;
