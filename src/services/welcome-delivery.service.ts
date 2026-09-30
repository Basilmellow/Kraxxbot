import { discordRequest, DiscordApiError } from './discord-transport';

export type WelcomeDeliveryTarget = 'CHANNEL' | 'DM';
export type WelcomeDeliveryResult = {
  target: WelcomeDeliveryTarget;
  status: 'SUCCESS' | 'FAILURE';
  errorCode?: string;
};

export type WelcomeMemberSnapshot = {
  guildId: string;
  guildName: string;
  memberCount: number;
  userId: string;
  username: string;
  userTag: string;
};

export type WelcomeDeliveryConfig = {
  enabled: boolean;
  channelId: string | null;
  message: string | null;
  imageUrl: string | null;
  dmEnabled: boolean;
  dmMessage: string | null;
  leaveChannelId: string | null;
  leaveMessage: string | null;
};

type MessagePayload = {
  content: string;
  embeds?: { image: { url: string } }[];
  allowed_mentions: { parse: string[]; users: string[] };
};

export interface WelcomeDeliveryAdapter {
  sendGuildMessage(guildId: string, channelId: string, payload: MessagePayload): Promise<void>;
  sendDirectMessage(userId: string, payload: MessagePayload): Promise<void>;
}

export function renderWelcomeText(template: string, member: WelcomeMemberSnapshot): string {
  return template
    .replaceAll('{user}', `<@${member.userId}>`)
    .replaceAll('{username}', member.username)
    .replaceAll('{server}', member.guildName)
    .replaceAll('{memberCount}', String(member.memberCount))
    .replaceAll('{rules}', 'the server rules');
}

function failureCode(error: unknown): string {
  if (error instanceof Error && error.message === 'DISCORD_NOT_CONFIGURED') return 'DISCORD_NOT_CONFIGURED';
  return error instanceof DiscordApiError ? `DISCORD_${error.status}` : 'DELIVERY_FAILED';
}

export function createWelcomeDeliveryAdapter(
  token: string,
  request: typeof discordRequest = discordRequest,
): WelcomeDeliveryAdapter {
  const api = 'https://discord.com/api/v10';
  const headers = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' };
  const call = (url: string, method: string, body?: unknown) => {
    if (!token) throw new Error('DISCORD_NOT_CONFIGURED');
    return request(url, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };
  return {
    async sendGuildMessage(guildId, channelId, payload) {
      const response = await call(`${api}/channels/${channelId}`, 'GET');
      const channel = await response.json() as { id: string; guild_id?: string; type: number };
      if (channel.id !== channelId || channel.guild_id !== guildId || ![0, 5].includes(channel.type))
        throw new Error('WELCOME_CHANNEL_SCOPE_INVALID');
      await call(`${api}/channels/${channelId}/messages`, 'POST', payload);
    },
    async sendDirectMessage(userId, payload) {
      const response = await call(`${api}/users/@me/channels`, 'POST', { recipient_id: userId });
      const channel = await response.json() as { id: string };
      if (!channel.id) throw new Error('DM_CHANNEL_UNAVAILABLE');
      await call(`${api}/channels/${channel.id}/messages`, 'POST', payload);
    },
  };
}

export async function deliverMemberWelcome(
  config: WelcomeDeliveryConfig,
  member: WelcomeMemberSnapshot,
  adapter: WelcomeDeliveryAdapter,
): Promise<WelcomeDeliveryResult[]> {
  if (!config.enabled) return [];
  const payloadFor = (template: string, withImage = false): MessagePayload => ({
    content: renderWelcomeText(template, member),
    ...(withImage && config.imageUrl ? { embeds: [{ image: { url: config.imageUrl } }] } : {}),
    allowed_mentions: { parse: [], users: [member.userId] },
  });
  const sends: { target: WelcomeDeliveryTarget; send: () => Promise<void> }[] = [];
  if (config.channelId) sends.push({
    target: 'CHANNEL',
    send: () => adapter.sendGuildMessage(member.guildId, config.channelId!, payloadFor(
      config.message || 'Welcome {user} to **{server}**! We are now {memberCount} members.', true,
    )),
  });
  if (config.dmEnabled) sends.push({
    target: 'DM',
    send: () => adapter.sendDirectMessage(member.userId, payloadFor(
      config.dmMessage || 'Welcome to {server}! Please review {rules} to get started.',
    )),
  });
  const settled = await Promise.all(sends.map(async ({ target, send }) => {
    try {
      await send();
      return { target, status: 'SUCCESS' as const };
    } catch (error) {
      return { target, status: 'FAILURE' as const, errorCode: failureCode(error) };
    }
  }));
  return settled;
}

export async function deliverMemberGoodbye(
  config: WelcomeDeliveryConfig,
  member: WelcomeMemberSnapshot,
  adapter: WelcomeDeliveryAdapter,
): Promise<WelcomeDeliveryResult | null> {
  if (!config.enabled || !config.leaveChannelId) return null;
  try {
    await adapter.sendGuildMessage(member.guildId, config.leaveChannelId, {
      content: renderWelcomeText(
        config.leaveMessage || '{username} has departed from {server}.', member,
      ),
      allowed_mentions: { parse: [], users: [member.userId] },
    });
    return { target: 'CHANNEL', status: 'SUCCESS' };
  } catch (error) {
    return { target: 'CHANNEL', status: 'FAILURE', errorCode: failureCode(error) };
  }
}
