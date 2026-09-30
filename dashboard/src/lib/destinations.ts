import { fetchBotRoleContext, fetchChannel, fetchGuildMember } from './discord';
import { memberPermissions } from './capabilities';
import { assertTenant, hasPermission, permission, PolicyError } from '../../../src/security/policy';

export async function validateChannel(guildId: string, channelId: string, send = true, requireEmbedLinks = true): Promise<void> {
  const [channel, context] = await Promise.all([fetchChannel(channelId), fetchBotRoleContext(guildId)]);
  if (!channel) throw new PolicyError();
  assertTenant(guildId, channel.guild_id);
  let bits = memberPermissions(context.botMember, context);
  if (!hasPermission(bits, permission(3))) {
    const overwrites = (channel.permission_overwrites || []) as { id: string; type: number; allow: string; deny: string }[];
    const apply = (allow: bigint, deny: bigint) => { bits = (bits & ~deny) | allow; };
    const everyone = overwrites.find(o => o.id === guildId);
    if (everyone) apply(BigInt(everyone.allow), BigInt(everyone.deny));
    const roles = overwrites.filter(o => o.type === 0 && context.botMember.roles.includes(o.id));
    apply(roles.reduce((b,o) => b | BigInt(o.allow), BigInt(0)), roles.reduce((b,o) => b | BigInt(o.deny), BigInt(0)));
    const own = overwrites.find(o => o.type === 1 && o.id === context.botMember.user?.id);
    if (own) apply(BigInt(own.allow), BigInt(own.deny));
  }
  if (
    !hasPermission(bits, permission(10)) ||
    (send && (
      !hasPermission(bits, permission(11)) ||
      (requireEmbedLinks && !hasPermission(bits, permission(14))) ||
      ![0, 5].includes(channel.type)
    ))
  )
    throw new PolicyError('The bot cannot send messages and embeds to this channel.');
}
export async function validateReminderDestination(guildId: string, actorId: string, type: string, id: string): Promise<void> {
  if (type === 'CHANNEL') return validateChannel(guildId, id);
  if (type !== 'USER' || id !== actorId) throw new PolicyError('Personal reminders must target the requesting user.');
  await fetchGuildMember(guildId, id);
}
