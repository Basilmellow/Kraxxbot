"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionTier = void 0;
exports.getMemberPermissionTier = getMemberPermissionTier;
exports.isTicketManager = isTicketManager;
exports.canManageDiscordRole = canManageDiscordRole;
const discord_js_1 = require("discord.js");
const policy_1 = require("../security/policy");
var PermissionTier;
(function (PermissionTier) {
    PermissionTier[PermissionTier["ADMINISTRATOR"] = 100] = "ADMINISTRATOR";
    PermissionTier[PermissionTier["MANAGER"] = 80] = "MANAGER";
    PermissionTier[PermissionTier["MODERATOR"] = 60] = "MODERATOR";
    PermissionTier[PermissionTier["SUPPORT"] = 40] = "SUPPORT";
    PermissionTier[PermissionTier["MEMBER"] = 10] = "MEMBER";
    PermissionTier[PermissionTier["NONE"] = 0] = "NONE";
})(PermissionTier || (exports.PermissionTier = PermissionTier = {}));
/**
 * Resolves the member's permission tier in the active guild.
 * Checks native Discord permissions first, then configured GuildSettings role IDs.
 */
function getMemberPermissionTier(member, settings) {
    if (!member)
        return PermissionTier.NONE;
    // Server Owner or Administrator permission
    if (member.id === member.guild.ownerId ||
        member.permissions.has(discord_js_1.PermissionFlagsBits.Administrator)) {
        return PermissionTier.ADMINISTRATOR;
    }
    // Manage Guild permission or configured Admin role
    if (member.permissions.has(discord_js_1.PermissionFlagsBits.ManageGuild)) {
        return PermissionTier.MANAGER;
    }
    if (settings?.adminRoleId && member.roles.cache.has(settings.adminRoleId)) {
        return PermissionTier.ADMINISTRATOR;
    }
    // Moderation permissions or configured Mod role
    if (member.permissions.has(discord_js_1.PermissionFlagsBits.ModerateMembers) ||
        member.permissions.has(discord_js_1.PermissionFlagsBits.BanMembers) ||
        member.permissions.has(discord_js_1.PermissionFlagsBits.KickMembers) ||
        member.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages)) {
        return PermissionTier.MODERATOR;
    }
    if (settings?.modRoleId && member.roles.cache.has(settings.modRoleId)) {
        return PermissionTier.MODERATOR;
    }
    // Support or staff role configured in GuildSettings
    if ((settings?.supportRoleId && member.roles.cache.has(settings.supportRoleId)) ||
        (settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId))) {
        return PermissionTier.SUPPORT;
    }
    return PermissionTier.MEMBER;
}
/**
 * Checks whether a member has ticket manager / support privileges in the guild.
 */
function isTicketManager(member, settings) {
    return getMemberPermissionTier(member, settings) >= PermissionTier.SUPPORT;
}
/**
 * Checks whether an executor can assign or manage a target role based on Discord hierarchy.
 */
function canManageDiscordRole(executor, targetRole) {
    try {
        const bot = executor.guild.members.me;
        if (!bot || targetRole.guild.id !== executor.guild.id)
            return { allowed: false, reason: 'Role context unavailable.' };
        (0, policy_1.assertRolePolicy)({ guildId: executor.guild.id, roleId: targetRole.id, managed: targetRole.managed,
            position: targetRole.position, permissions: targetRole.permissions.bitfield,
            actorPermissions: executor.permissions.bitfield, botPermissions: bot.permissions.bitfield,
            actorPosition: executor.roles.highest.position, botPosition: bot.roles.highest.position, owner: executor.id === executor.guild.ownerId });
        return { allowed: true };
    }
    catch {
        return { allowed: false, reason: 'You or the bot cannot manage this role.' };
    }
}
