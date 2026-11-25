"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAutomaticRole = validateAutomaticRole;
const policy_1 = require("./policy");
async function validateAutomaticRole(guild, roleId) {
    const bot = await guild.members.fetchMe();
    const role = await guild.roles.fetch(roleId);
    if (!role)
        throw new Error('Configured role no longer exists.');
    (0, policy_1.assertRolePolicy)({ guildId: guild.id, roleId, managed: role.managed, position: role.position,
        permissions: role.permissions.bitfield, actorPermissions: bot.permissions.bitfield, botPermissions: bot.permissions.bitfield,
        actorPosition: bot.roles.highest.position, botPosition: bot.roles.highest.position, owner: true }, true);
    return role;
}
