import { fetchBotRoleContext, fetchGuildMember, type DiscordMember, type BotRoleContext } from './discord';
import { assertRolePolicy, hasPermission, permission, PolicyError } from '../../../src/security/policy';

export type Capability = 'MANAGE_SETTINGS' | 'MANAGE_ROLES' | 'MANAGE_TICKETS' | 'MANAGE_AUTOMATIONS' | 'MANAGE_ANNOUNCEMENTS' | 'MANAGE_SUGGESTIONS' | 'MODERATE_MEMBER';
export function memberPermissions(member: DiscordMember, context: BotRoleContext): bigint {
  return context.roles.filter(r => r.id === context.guild.id || member.roles.includes(r.id))
    .reduce((bits, r) => bits | BigInt(r.permissions), BigInt(0));
}
export function memberPosition(member: DiscordMember, context: BotRoleContext): number {
  return context.roles.filter(r => member.roles.includes(r.id)).reduce((n, r) => Math.max(n, r.position), 0);
}
export async function requireGuildCapability(guildId: string, userId: string, capability: Capability) {
  const context = await fetchBotRoleContext(guildId);
  const actor = await fetchGuildMember(guildId, userId);
  const bits = memberPermissions(actor, context);
  const required = capability === 'MANAGE_ROLES' ? permission(28)
    : capability === 'MODERATE_MEMBER' ? permission(40) : permission(5);
  if (userId !== context.guild.owner_id && !hasPermission(bits, required)) throw new PolicyError();
  return { context, actor, bits };
}
export async function authorizeRole(guildId: string, actorId: string, roleId: string, selfRole = false) {
  const { context, actor, bits } = await requireGuildCapability(guildId, actorId, 'MANAGE_ROLES');
  const role = context.roles.find(r => r.id === roleId);
  if (!role) throw new PolicyError('Role does not belong to this server.');
  assertRolePolicy({ guildId, roleId, managed: role.managed, position: role.position,
    permissions: BigInt(role.permissions), actorPermissions: bits,
    botPermissions: memberPermissions(context.botMember, context),
    actorPosition: memberPosition(actor, context), botPosition: context.highestRolePosition,
    owner: context.guild.owner_id === actorId }, selfRole);
}
