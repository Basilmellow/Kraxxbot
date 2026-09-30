import { Guild, Role } from 'discord.js';
import { assertRolePolicy } from './policy';
export async function validateAutomaticRole(guild: Guild, roleId: string): Promise<Role> {
  const bot = await guild.members.fetchMe();
  const role = await guild.roles.fetch(roleId);
  if (!role) throw new Error('Configured role no longer exists.');
  assertRolePolicy({guildId:guild.id,roleId,managed:role.managed,position:role.position,
    permissions:role.permissions.bitfield,actorPermissions:bot.permissions.bitfield,botPermissions:bot.permissions.bitfield,
    actorPosition:bot.roles.highest.position,botPosition:bot.roles.highest.position,owner:true}, true);
  return role;
}
