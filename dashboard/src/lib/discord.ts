import { DiscordApiError,discordRequest } from './discord-transport';
// KRAXXBot Web Dashboard — Discord REST API Client
// Fully parameterized — no DISCORD_GUILD_ID env var dependency.
// Every call takes an explicit guildId parameter for multi-tenant isolation.

const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Discord permission bit flags
const ADMINISTRATOR = BigInt(0x8);
const MANAGE_GUILD = BigInt(0x20);
const MANAGE_ROLES = BigInt(1) << BigInt(28);

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN is not configured. Server-side Discord operations unavailable.');
  }
  return token;
}

async function discordFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}${endpoint}`;

  const res = await discordRequest(url, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  });


  return (res.status === 204 ? undefined : await res.json()) as T;
}

// ─────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
  approximate_member_count?: number;
  approximate_presence_count?: number;
}

export interface UserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // Numeric string of permission bits
  features: string[];
}

export interface ManagedGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botInstalled: boolean;
  needsSync?: boolean;
  inviteUrl: string;
}

export interface DiscordMember {
  user?: {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string | null;
    avatar: string | null;
    bot?: boolean;
  };
  nick?: string | null;
  roles: string[];
  joined_at: string;
  communication_disabled_until?: string | null;
}

export interface DiscordChannel {
  id: string;
  guild_id?: string;
  name: string;
  type: number; // 0=text, 2=voice, 4=category, 5=announcement, 13=stage, 15=forum
  position: number;
  parent_id?: string | null;
  topic?: string | null;
  permission_overwrites?: Array<{ id: string; type: number; allow: string; deny: string }>;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

export type RoleManageabilityReason = 'EVERYONE' | 'MANAGED' | 'MISSING_MANAGE_ROLES' | 'ABOVE_BOT_ROLE';

export interface DiscordRoleCapability extends DiscordRole {
  manageable: boolean;
  manageabilityReason: RoleManageabilityReason | null;
}

export interface BotRoleContext {
  guild: DiscordGuild;
  botMember: DiscordMember;
  roles: DiscordRole[];
  highestRolePosition: number;
  canManageRoles: boolean;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
  bot?: boolean;
}

export interface DiscordBan {
  reason: string | null;
  user: DiscordUser;
}

export type DiscordMessageResponse = Record<string, unknown> & { id: string };

// ─────────────────────────────────────────────────────────────────
// Bot Invite URL
// ─────────────────────────────────────────────────────────────────

const BOT_INVITE_PERMISSIONS =
  // Manage Channels, Manage Roles, View Audit Log, Moderate Members,
  // Send Messages, Embed Links, Attach Files, Read Message History, Manage Messages,
  // Add Reactions, Use External Emojis, View Channel
  '536953952337';

export function getBotInviteUrl(guildId?: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const params = new URLSearchParams({
    client_id: clientId || '',
    permissions: BOT_INVITE_PERMISSIONS,
    integration_type: '0',
    scope: 'bot applications.commands',
    ...(guildId ? { guild_id: guildId } : {}),
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────
// Guild Operations (parameterized by guildId)
// ─────────────────────────────────────────────────────────────────

/**
 * Fetches guild information with live presence and member counts.
 */
export async function fetchGuildById(guildId: string): Promise<DiscordGuild> {
  return discordFetch<DiscordGuild>(`/guilds/${guildId}?with_counts=true`);
}

export const fetchGuild = async (guildId: string): Promise<DiscordGuild> => {
  if (!guildId) throw new Error('guildId is required to fetch guild');
  return fetchGuildById(guildId);
};

/**
 * Checks whether the bot is installed in a given guild by trying to fetch it.
 * Returns true if bot has access, false otherwise.
 */
export async function isBotInstalledInGuild(guildId: string): Promise<boolean> {
  try {
    await discordFetch<DiscordGuild>(`/guilds/${guildId}`);
    return true;
  } catch (error) {
    // A missing/forbidden guild means this bot is not a member. Other failures
    // (rate limiting, invalid token, Discord outage) must remain distinguishable
    // so callers can fail closed instead of reporting a false uninstall.
    if (
      error instanceof Error
      && error instanceof DiscordApiError && [403, 404].includes(error.status)
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Fetches the list of guilds where the authenticated user has MANAGE_GUILD or ADMINISTRATOR.
 * Uses the user's OAuth access token — returns only manageable guilds.
 */
export async function fetchUserGuilds(accessToken: string): Promise<UserGuild[]> {
  const res = await discordRequest(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });


  const guilds: UserGuild[] = await res.json();

  return guilds.filter(guild => {
    if (guild.owner) return true;
    try {
      const perms = BigInt(guild.permissions);
      return (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;
    } catch {
      return false;
    }
  });
}

/**
 * Fetches all channels for a specific guild.
 */
export async function fetchGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  if (!guildId) return [];
  return discordFetch<DiscordChannel[]>(`/guilds/${guildId}/channels`);
}

export async function fetchChannel(channelId: string): Promise<DiscordChannel> {
  return discordFetch<DiscordChannel>(`/channels/${channelId}`);
}

export async function createGuildTextChannel(
  guildId: string,
  input: { name: string; topic: string; parent_id?: string; permission_overwrites: Array<{ id: string; type: number; allow: string; deny: string }> },
): Promise<DiscordChannel> {
  if (!/^\d{17,20}$/.test(guildId)) throw new Error('Invalid guild context.');
  const channel = await discordFetch<DiscordChannel>(`/guilds/${guildId}/channels`, { method: 'POST', body: JSON.stringify({ type: 0, ...input }) });
  if (channel.guild_id !== guildId || channel.type !== 0) throw new Error('Discord returned a channel outside the requested guild.');
  return channel;
}

export async function deleteGuildChannel(guildId: string, channelId: string): Promise<void> {
  const channel = await fetchChannel(channelId);
  if (channel.guild_id !== guildId) throw new Error('Ticket channel does not belong to this guild.');
  await discordFetch<void>(`/channels/${channelId}`, { method: 'DELETE' });
}

/**
 * Fetches all roles for a specific guild.
 */
export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  if (!guildId) return [];
  return discordFetch<DiscordRole[]>(`/guilds/${guildId}/roles`);
}

/** Fetches live bot membership and guild role data for safe role capability checks. */
export async function fetchBotRoleContext(guildId: string): Promise<BotRoleContext> {
  const [guild, bot, roles] = await Promise.all([
    fetchGuildById(guildId),
    fetchBotUser(),
    fetchGuildRoles(guildId),
  ]);
  const botMember = await fetchGuildMember(guildId, bot.id);
  const botRoleIds = new Set([guildId, ...botMember.roles]);
  const botRoles = roles.filter((role) => botRoleIds.has(role.id));
  const everyoneRole = roles.find((role) => role.id === guildId);
  const highestRolePosition = botRoles.reduce(
    (highest, role) => Math.max(highest, role.position),
    everyoneRole?.position ?? 0,
  );

  let permissions = BigInt(0);
  for (const role of roles) {
    if (!botRoleIds.has(role.id)) continue;
    try {
      permissions |= BigInt(role.permissions);
    } catch {
      // An unreadable permission bitfield fails closed below.
      permissions = BigInt(0);
      break;
    }
  }

  return {
    guild,
    botMember,
    roles,
    highestRolePosition,
    canManageRoles: (permissions & ADMINISTRATOR) === ADMINISTRATOR || (permissions & MANAGE_ROLES) === MANAGE_ROLES,
  };
}

export function getRoleManageability(role: DiscordRole, context: BotRoleContext): DiscordRoleCapability {
  let manageabilityReason: RoleManageabilityReason | null = null;
  if (role.id === context.guild.id) manageabilityReason = 'EVERYONE';
  else if (role.managed) manageabilityReason = 'MANAGED';
  else if (role.position >= context.highestRolePosition) manageabilityReason = 'ABOVE_BOT_ROLE';
  else if (!context.canManageRoles) manageabilityReason = 'MISSING_MANAGE_ROLES';

  return { ...role, manageable: manageabilityReason === null, manageabilityReason };
}

/**
 * Fetches a specific member from a guild.
 */
export async function fetchGuildMember(guildId: string, userId: string): Promise<DiscordMember> {
  return discordFetch<DiscordMember>(`/guilds/${guildId}/members/${userId}`);
}

/**
 * Fetches guild members (paginated, up to 1000 per call).
 */
export async function fetchGuildMembers(
  guildId: string,
  limit = 100,
  after = '0'
): Promise<DiscordMember[]> {
  if (!guildId) return [];
  const requestedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 100;
  const boundedLimit = Math.max(1, Math.min(requestedLimit, 1000));
  const members: DiscordMember[] = [];
  let cursor = after || '0';

  while (members.length < boundedLimit) {
    const pageSize = Math.min(100, boundedLimit - members.length);
    const page = await discordFetch<DiscordMember[]>(
      `/guilds/${guildId}/members?limit=${pageSize}&after=${encodeURIComponent(cursor)}`
    );
    if (page.length === 0) break;

    members.push(...page);
    const nextCursor = page[page.length - 1]?.user?.id;
    if (!nextCursor || nextCursor === cursor || page.length < pageSize) break;
    cursor = nextCursor;
  }

  return members.slice(0, boundedLimit);
}

// ─────────────────────────────────────────────────────────────────
// Moderation Operations
// ─────────────────────────────────────────────────────────────────


/**
 * Adds a role to a guild member.
 */
export async function addMemberRole(
  guildId: string,
  userId: string,
  roleId: string,
  reason?: string
): Promise<boolean> {
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`;

  await discordRequest(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    cache: 'no-store',
  });


  return true;
}

/**
 * Removes a role from a guild member.
 */
export async function removeMemberRole(
  guildId: string,
  userId: string,
  roleId: string,
  reason?: string
): Promise<boolean> {
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`;

  await discordRequest(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${token}`,
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    cache: 'no-store',
  });


  return true;
}

/** Creates a standard (non-managed) role in the explicitly selected guild. */
export async function createGuildRole(
  guildId: string,
  input: { name: string; color?: number; hoist?: boolean; mentionable?: boolean; permissions?: string },
  reason?: string,
): Promise<DiscordRole> {
  return discordFetch<DiscordRole>(`/guilds/${guildId}/roles`, {
    method: 'POST',
    headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
    body: JSON.stringify(input),
  });
}

/** Updates editable fields on a standard role in the explicitly selected guild. */
export async function editGuildRole(
  guildId: string,
  roleId: string,
  input: { name?: string; color?: number; hoist?: boolean; mentionable?: boolean; permissions?: string },
  reason?: string,
): Promise<DiscordRole> {
  return discordFetch<DiscordRole>(`/guilds/${guildId}/roles/${roleId}`, {
    method: 'PATCH',
    headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
    body: JSON.stringify(input),
  });
}

/** Deletes a standard role after its hierarchy has been authorized by the caller. */
export async function deleteGuildRole(guildId: string, roleId: string, reason?: string): Promise<boolean> {
  const token = getBotToken();
  await discordRequest(`${DISCORD_API_BASE}/guilds/${guildId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${token}`,
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    cache: 'no-store',
  });
  return true;
}

// ─────────────────────────────────────────────────────────────────
// Channel & Message Operations
// ─────────────────────────────────────────────────────────────────

/**
 * Sends a message or embed to a Discord channel.
 */
export async function sendChannelMessage(
  channelId: string,
  content?: string,
  embeds?: object[],
  options: { allowedMentions?: { parse: string[]; roles?: string[]; users?: string[] }; nonce?: string; components?: object[] } = {},
): Promise<DiscordMessageResponse> {
  const body: Record<string, unknown> = { allowed_mentions: options.allowedMentions || { parse: [] } };
  if (content) body.content = content;
  if (embeds && embeds.length > 0) body.embeds = embeds;
  if (options.components) body.components = options.components;
  if (options.nonce) { body.nonce = options.nonce; body.enforce_nonce = true; }

  return discordFetch<DiscordMessageResponse>(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Fetches a message from a Discord channel.
 */
export async function fetchChannelMessage(
  channelId: string,
  messageId: string
): Promise<DiscordMessageResponse> {
  return discordFetch<DiscordMessageResponse>(`/channels/${channelId}/messages/${messageId}`);
}

/** Reads a bounded recent channel window for explicit recovery of an uncertain KRAXXBot message send. */
export async function fetchChannelMessages(channelId: string, limit = 100): Promise<DiscordMessageResponse[]> {
  if (!/^\d{17,20}$/.test(channelId) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('INVALID_CHANNEL_MESSAGE_QUERY');
  return discordFetch<DiscordMessageResponse[]>(`/channels/${channelId}/messages?limit=${limit}`);
}

/**
 * Edits an existing message sent by the bot.
 */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  content?: string,
  embeds?: object[],
  allowedMentions: { parse: string[]; roles?: string[]; users?: string[] } = { parse: [] },
  components?: object[],
): Promise<DiscordMessageResponse> {
  const body: Record<string, unknown> = { allowed_mentions: allowedMentions };
  if (content !== undefined) body.content = content;
  if (embeds !== undefined) body.embeds = embeds;
  if (components !== undefined) body.components = components;

  return discordFetch<DiscordMessageResponse>(`/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Deletes a message from a Discord channel.
 */
export async function deleteChannelMessage(
  channelId: string,
  messageId: string
): Promise<boolean> {
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}`;

  await discordRequest(url, {
    method: 'DELETE',
    headers: { Authorization: `Bot ${token}` },
    cache: 'no-store',
  });


  return true;
}

/**
 * Sends a Direct Message to a Discord user.
 */
export async function sendDirectMessage(
  userId: string,
  content?: string,
  embeds?: object[]
): Promise<DiscordMessageResponse> {
  const dmChannel = await discordFetch<{ id: string }>('/users/@me/channels', {
    method: 'POST',
    body: JSON.stringify({ recipient_id: userId }),
  });

  return sendChannelMessage(dmChannel.id, content, embeds);
}

/**
 * Fetches the bot user's profile to verify token validity.
 */
export async function fetchBotUser(): Promise<DiscordUser> {
  return discordFetch<DiscordUser>('/users/@me');
}

export async function setTicketAccess(guildId: string, channelId: string, memberId: string, open: boolean): Promise<void> {
  const channels = await fetchGuildChannels(guildId);
  const channel = channels.find(c => c.id === channelId);
  if (!channel || channel.guild_id !== guildId) throw new Error('Ticket channel does not belong to this guild.');
  await fetchGuildMember(guildId, memberId);
  const context = await fetchBotRoleContext(guildId);
  const { memberPermissions } = await import('./capabilities');
  const { hasPermission, permission, PolicyError } = await import('../../../src/security/policy');
  if (!hasPermission(memberPermissions(context.botMember, context), permission(28))) throw new PolicyError('Bot cannot update ticket access.');
  const existing = channel.permission_overwrites?.find((overwrite) => overwrite.id === memberId && overwrite.type === 1);
  let allow = BigInt(existing?.allow || '0');
  let deny = BigInt(existing?.deny || '0');
  const sendMessages = BigInt(1) << BigInt(11);
  if (open) {
    allow |= sendMessages;
    deny &= ~sendMessages;
  } else {
    allow &= ~sendMessages;
    deny |= sendMessages;
  }
  await discordFetch(`/channels/${channelId}/permissions/${memberId}`, { method: 'PUT', body: JSON.stringify({
    type: 1, allow: String(allow), deny: String(deny),
  }) });
}
