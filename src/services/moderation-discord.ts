import {
  assertModerationHierarchy,
  hasPermission,
  permission,
  PolicyError,
} from '../security/policy';
import { discordRequest } from './discord-transport';
import { isChannelAction, ModerationError, type ModerationInput } from './moderation-contract';

type Role = { id: string; permissions: string; position: number };
type Member = {
  user: { id: string };
  roles: string[];
  communication_disabled_until?: string | null;
};
type Overwrite = { id: string; type: number; allow: string; deny: string };
type Channel = {
  id: string;
  guild_id: string;
  type: number;
  permission_overwrites: Overwrite[];
  rate_limit_per_user?: number;
};
export type ModerationSnapshot = { channel?: Channel };
export type ModerationPlan = { details: Record<string, unknown>; perform: () => Promise<void> };
export interface ModerationAdapter {
  authorize(input: ModerationInput): Promise<ModerationSnapshot>;
  prepare(
    input: ModerationInput,
    snapshot: ModerationSnapshot,
    previousLock: Record<string, unknown> | null
  ): Promise<ModerationPlan>;
}
export function channelPermissions(
  base: bigint,
  member: Member,
  channel: Channel,
  guildId: string
): bigint {
  if (hasPermission(base, permission(3))) return base;
  const apply = (bits: bigint, allow: bigint, deny: bigint) => (bits & ~deny) | allow;
  const everyone = channel.permission_overwrites.find(o => o.type === 0 && o.id === guildId);
  if (everyone) base = apply(base, BigInt(everyone.allow), BigInt(everyone.deny));
  let allow = BigInt(0),
    deny = BigInt(0);
  for (const o of channel.permission_overwrites.filter(
    o => o.type === 0 && member.roles.includes(o.id)
  )) {
    allow |= BigInt(o.allow);
    deny |= BigInt(o.deny);
  }
  base = apply(base, allow, deny);
  const individual = channel.permission_overwrites.find(
    o => o.type === 1 && o.id === member.user.id
  );
  return individual ? apply(base, BigInt(individual.allow), BigInt(individual.deny)) : base;
}
export function createModerationAdapter(token: string): ModerationAdapter {
  if (!token) throw new ModerationError('DISCORD_NOT_CONFIGURED', 503);
  const request = async <T>(
    path: string,
    method = 'GET',
    body?: unknown,
    reason?: string
  ): Promise<T> => {
    const response = await discordRequest(`https://discord.com/api/v10${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return (response.status === 204 ? undefined : await response.json()) as T;
  };
  return {
    async authorize(input) {
      const { guildId, actorId, targetId, action } = input;
      const guild = await request<{ id: string; owner_id: string }>(`/guilds/${guildId}`);
      if (guild.id !== guildId) throw new PolicyError();
      const [roles, actor, botUser] = await Promise.all([
        request<Role[]>(`/guilds/${guildId}/roles`),
        request<Member>(`/guilds/${guildId}/members/${actorId}`),
        request<{ id: string }>('/users/@me'),
      ]);
      const bot = await request<Member>(`/guilds/${guildId}/members/${botUser.id}`);
      if (actor.user.id !== actorId || bot.user.id !== botUser.id) throw new PolicyError();
      const bits = (m: Member) =>
        roles
          .filter(r => r.id === guildId || m.roles.includes(r.id))
          .reduce((b, r) => b | BigInt(r.permissions), BigInt(0));
      const position = (m: Member) =>
        roles.filter(r => m.roles.includes(r.id)).reduce((p, r) => Math.max(p, r.position), 0);
      let actorBits = actorId === guild.owner_id ? permission(3) : bits(actor),
        botBits = bits(bot);
      if (isChannelAction(action)) {
        const channel = await request<Channel>(`/channels/${targetId}`);
        if (
          channel.guild_id !== guildId ||
          channel.id !== targetId ||
          ![0, 5].includes(channel.type) ||
          (action === 'SLOWMODE' && channel.type !== 0) ||
          !Array.isArray(channel.permission_overwrites)
        )
          throw new PolicyError('Invalid server text channel.');
        actorBits = channelPermissions(actorBits, actor, channel, guildId);
        botBits = channelPermissions(botBits, bot, channel, guildId);
        const required =
          permission(10) |
          (action === 'PURGE'
            ? permission(13) | permission(16)
            : action === 'SLOWMODE'
              ? permission(4)
              : permission(28));
        if (!hasPermission(actorBits, required) || !hasPermission(botBits, required))
          throw new PolicyError();
        if (
          ['LOCK', 'UNLOCK'].includes(action) &&
          ((!hasPermission(bits(bot), permission(11)) && !hasPermission(botBits, permission(11))) ||
            (actorId !== guild.owner_id &&
              !hasPermission(bits(actor), permission(11)) &&
              !hasPermission(actorBits, permission(11))))
        )
          throw new PolicyError();
        if (
          (actor.communication_disabled_until &&
            new Date(actor.communication_disabled_until).getTime() > Date.now()) ||
          (bot.communication_disabled_until &&
            new Date(bot.communication_disabled_until).getTime() > Date.now())
        )
          throw new PolicyError();
        return { channel };
      }
      const requiredBit = (
        { WARN: 40, TIMEOUT: 40, KICK: 1, BAN: 2, UNBAN: 2 } as Record<string, number>
      )[action];
      if (
        requiredBit === undefined ||
        !hasPermission(actorBits, permission(requiredBit)) ||
        (action !== 'WARN' && !hasPermission(botBits, permission(requiredBit)))
      )
        throw new PolicyError();
      if (action !== 'UNBAN') {
        const target = await request<Member>(`/guilds/${guildId}/members/${targetId}`);
        if (target.user.id !== targetId) throw new PolicyError();
        assertModerationHierarchy({
          actorId,
          targetId,
          ownerId: guild.owner_id,
          botId: botUser.id,
          actorPosition: position(actor),
          targetPosition: position(target),
          botPosition: position(bot),
          enforceBotHierarchy: action !== 'WARN',
        });
        if (action === 'TIMEOUT' && hasPermission(bits(target), permission(3)))
          throw new PolicyError();
      } else {
        const ban = await request<{ user: { id: string } }>(`/guilds/${guildId}/bans/${targetId}`);
        if (ban.user.id !== targetId) throw new PolicyError();
      }
      return {};
    },
    async prepare(input, snapshot, previousLock) {
      const { guildId, targetId, action, durationSeconds, count, actorId } = input;
      const reason = `${input.reason} [actor ${actorId}]`;
      const mutate = (path: string, method: string, body?: unknown) => async () => {
        await request(path, method, body, reason);
      };
      const channelPath = `/channels/${targetId}`;
      const memberPath = `/guilds/${guildId}/members/${targetId}`;
      switch (action) {
        case 'WARN':
          return { details: {}, perform: async () => {} };
        case 'TIMEOUT': {
          const until =
            durationSeconds === 0
              ? null
              : new Date(Date.now() + durationSeconds * 1000).toISOString();
          return {
            details: { until },
            perform: mutate(memberPath, 'PATCH', { communication_disabled_until: until }),
          };
        }
        case 'KICK':
          return { details: {}, perform: mutate(memberPath, 'DELETE') };
        case 'BAN':
          return {
            details: {},
            perform: mutate(`/guilds/${guildId}/bans/${targetId}`, 'PUT', {
              delete_message_seconds: 0,
            }),
          };
        case 'UNBAN':
          return { details: {}, perform: mutate(`/guilds/${guildId}/bans/${targetId}`, 'DELETE') };
        case 'SLOWMODE':
          return {
            details: { seconds: durationSeconds },
            perform: mutate(channelPath, 'PATCH', { rate_limit_per_user: durationSeconds }),
          };
        case 'PURGE': {
          const messages = await request<{ id: string; pinned?: boolean }[]>(
            `${channelPath}/messages?limit=${count}`
          );
          const cutoff = Date.now() - 14 * 86400000 + 60000;
          const ids = messages
            .filter(
              m =>
                !m.pinned &&
                /^\d{17,20}$/.test(m.id) &&
                Number(BigInt(m.id) >> BigInt(22)) + 1420070400000 > cutoff
            )
            .map(m => m.id);
          if (new Set(ids).size !== ids.length || ids.length > count)
            throw new ModerationError('INVALID_DISCORD_MESSAGES', 502);
          return {
            details: {
              messageIds: ids,
              deletedCount: ids.length,
              skippedCount: messages.length - ids.length,
            },
            perform:
              ids.length === 0
                ? async () => {}
                : ids.length === 1
                  ? mutate(`${channelPath}/messages/${ids[0]}`, 'DELETE')
                  : mutate(`${channelPath}/messages/bulk-delete`, 'POST', { messages: ids }),
          };
        }
        case 'LOCK':
        case 'UNLOCK': {
          const channel = snapshot.channel!;
          const overwrite = channel.permission_overwrites.find(
            o => o.type === 0 && o.id === guildId
          );
          const allow = BigInt(overwrite?.allow ?? '0'),
            deny = BigInt(overwrite?.deny ?? '0'),
            mask = permission(11);
          const denied = (deny & mask) !== BigInt(0) && (allow & mask) === BigInt(0);
          if (previousLock && !denied) throw new ModerationError('LOCK_CHANGED_EXTERNALLY', 409);
          if (action === 'LOCK' && previousLock)
            return { details: { ...previousLock, noChange: true }, perform: async () => {} };
          if (action === 'UNLOCK' && !previousLock)
            return { details: { noChange: true }, perform: async () => {} };
          const saved = previousLock ?? {
            previousAllow: (allow & mask).toString(),
            previousDeny: (deny & mask).toString(),
          };
          const nextAllow =
            action === 'LOCK'
              ? allow & ~mask
              : (allow & ~mask) | BigInt(String(saved.previousAllow));
          const nextDeny =
            action === 'LOCK' ? deny | mask : (deny & ~mask) | BigInt(String(saved.previousDeny));
          return {
            details: { ...saved, scope: 'EVERYONE_SEND_MESSAGES' },
            perform: mutate(`${channelPath}/permissions/${guildId}`, 'PUT', {
              type: 0,
              allow: nextAllow.toString(),
              deny: nextDeny.toString(),
            }),
          };
        }
        default:
          throw new ModerationError('INVALID_ACTION');
      }
    },
  };
}
