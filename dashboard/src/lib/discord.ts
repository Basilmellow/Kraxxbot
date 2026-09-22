// KRAXXBot Web Dashboard — Discord REST API Client
// Fully parameterized — no DISCORD_GUILD_ID env var dependency.
// Every call takes an explicit guildId parameter for multi-tenant isolation.

const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Discord permission bit flags
const ADMINISTRATOR = BigInt(0x8);
const MANAGE_GUILD = BigInt(0x20);

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

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord API Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return res.json() as Promise<T>;
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
  inviteUrl: string;
}

export interface DiscordMember {
  user?: {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string | null;
    avatar: string | null;
  };
  nick?: string | null;
  roles: string[];
  joined_at: string;
  communication_disabled_until?: string | null;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number; // 0=text, 2=voice, 4=category, 5=announcement, 13=stage, 15=forum
  position: number;
  parent_id?: string | null;
  topic?: string | null;
  permission_overwrites?: object[];
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
  } catch {
    return false;
  }
}

/**
 * Fetches the list of guilds where the authenticated user has MANAGE_GUILD or ADMINISTRATOR.
 * Uses the user's OAuth access token — returns only manageable guilds.
 */
export async function fetchUserGuilds(accessToken: string): Promise<UserGuild[]> {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Guilds Fetch Error [${res.status}]: ${errorText || res.statusText}`);
  }

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

/**
 * Fetches all roles for a specific guild.
 */
export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  if (!guildId) return [];
  return discordFetch<DiscordRole[]>(`/guilds/${guildId}/roles`);
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
  return discordFetch<DiscordMember[]>(
    `/guilds/${guildId}/members?limit=${limit}&after=${after}`
  );
}

// ─────────────────────────────────────────────────────────────────
// Moderation Operations
// ─────────────────────────────────────────────────────────────────

/**
 * Kicks a member from a specific guild.
 */
export async function kickGuildMember(
  guildId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${token}`,
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Kick Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return true;
}

/**
 * Bans a user from a specific guild.
 */
export async function banGuildMember(
  guildId: string,
  userId: string,
  reason?: string,
  deleteMessageSeconds = 0
): Promise<boolean> {
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/bans/${userId}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    body: JSON.stringify({ delete_message_seconds: deleteMessageSeconds }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Ban Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return true;
}

/**
 * Unbans a user from a specific guild.
 */
export async function unbanGuildMember(
  guildId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/bans/${userId}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${token}`,
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Unban Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return true;
}

/**
 * Times out (mutes) a member. Set durationSeconds to null or 0 to remove timeout.
 */
export async function timeoutGuildMember(
  guildId: string,
  userId: string,
  durationSeconds: number | null,
  reason?: string
): Promise<boolean> {
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`;

  const communicationDisabledUntil =
    durationSeconds && durationSeconds > 0
      ? new Date(Date.now() + durationSeconds * 1000).toISOString()
      : null;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    body: JSON.stringify({ communication_disabled_until: communicationDisabledUntil }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Timeout Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return true;
}

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

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Add Role Error [${res.status}]: ${errorText || res.statusText}`);
  }

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

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${token}`,
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Remove Role Error [${res.status}]: ${errorText || res.statusText}`);
  }

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
  embeds?: object[]
): Promise<Record<string, any>> {
  const body: Record<string, unknown> = {};
  if (content) body.content = content;
  if (embeds && embeds.length > 0) body.embeds = embeds;

  return discordFetch<Record<string, any>>(`/channels/${channelId}/messages`, {
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
): Promise<Record<string, any>> {
  return discordFetch<Record<string, any>>(`/channels/${channelId}/messages/${messageId}`);
}

/**
 * Edits an existing message sent by the bot.
 */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  content?: string,
  embeds?: object[]
): Promise<Record<string, any>> {
  const body: Record<string, unknown> = {};
  if (content !== undefined) body.content = content;
  if (embeds !== undefined) body.embeds = embeds;

  return discordFetch<Record<string, any>>(`/channels/${channelId}/messages/${messageId}`, {
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

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bot ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Delete Message Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return true;
}

/**
 * Sends a Direct Message to a Discord user.
 */
export async function sendDirectMessage(
  userId: string,
  content?: string,
  embeds?: object[]
): Promise<Record<string, any>> {
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
