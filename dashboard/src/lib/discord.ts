// KRAXX Operations Platform — Discord REST API Client
// Native fetch-based Discord REST client — 100% Vercel & Serverless compatible

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

/** @deprecated Use explicit guildId parameter instead */
function getGuildId(): string {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    throw new Error('DISCORD_GUILD_ID is not configured.');
  }
  return guildId;
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

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  approximate_member_count?: number;
  approximate_presence_count?: number;
}

/**
 * Represents a guild from the /users/@me/guilds endpoint.
 * Uses string permissions field (not BigInt) as returned by Discord API.
 */
export interface UserGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string; // Numeric string of permission bits
  features: string[];
}

/**
 * Resolved guild with bot installation status.
 */
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
    avatar: string | null;
  };
  nick?: string | null;
  roles: string[];
  joined_at: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id?: string | null;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  bot?: boolean;
}

/**
 * Fetches guild information with live presence and member counts.
 * Uses the bot token — parameterized by guildId.
 */
export async function fetchGuildById(guildId: string): Promise<DiscordGuild> {
  return discordFetch<DiscordGuild>(`/guilds/${guildId}?with_counts=true`);
}

/**
 * @deprecated Use fetchGuildById(guildId) instead.
 * Fetches guild information for the env-configured guild.
 */
export async function fetchGuild(): Promise<DiscordGuild> {
  const guildId = getGuildId();
  return discordFetch<DiscordGuild>(`/guilds/${guildId}?with_counts=true`);
}

/**
 * Fetches the list of guilds where the authenticated user has MANAGE_GUILD or ADMINISTRATOR
 * permissions (i.e., is an admin/owner). Uses the user's OAuth access token.
 * Returns only guilds where the user can manage the server.
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

  // Filter to only guilds where the user can manage (owner, admin, or manage_guild)
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
 * Fetches a specific guild member by Discord user ID.
 */
export async function fetchGuildMember(userId: string): Promise<DiscordMember> {
  const guildId = getGuildId();
  return discordFetch<DiscordMember>(`/guilds/${guildId}/members/${userId}`);
}

/**
 * Fetches all guild channels.
 */
export async function fetchGuildChannels(): Promise<DiscordChannel[]> {
  const guildId = getGuildId();
  return discordFetch<DiscordChannel[]>(`/guilds/${guildId}/channels`);
}

/**
 * Fetches all guild roles.
 */
export async function fetchGuildRoles(): Promise<DiscordRole[]> {
  const guildId = getGuildId();
  return discordFetch<DiscordRole[]>(`/guilds/${guildId}/roles`);
}

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
 * Fetches a single message from a Discord channel.
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
    headers: {
      Authorization: `Bot ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord API Delete Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return true;
}

/**
 * Fetches the bot user's profile to verify token validity.
 */
export async function fetchBotUser(): Promise<DiscordUser> {
  return discordFetch<DiscordUser>('/users/@me');
}

/**
 * Fetches a list of guild members (paginated up to 1000).
 */
export async function fetchGuildMembers(limit = 100, after = '0'): Promise<DiscordMember[]> {
  const guildId = getGuildId();
  return discordFetch<DiscordMember[]>(`/guilds/${guildId}/members?limit=${limit}&after=${after}`);
}

/**
 * Adds a role to a guild member.
 */
export async function addMemberRole(userId: string, roleId: string, reason?: string): Promise<boolean> {
  const guildId = getGuildId();
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
export async function removeMemberRole(userId: string, roleId: string, reason?: string): Promise<boolean> {
  const guildId = getGuildId();
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

/**
 * Kicks a member from the guild.
 */
export async function kickGuildMember(userId: string, reason?: string): Promise<boolean> {
  const guildId = getGuildId();
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
 * Bans a user from the guild.
 */
export async function banGuildMember(
  userId: string,
  reason?: string,
  deleteMessageSeconds = 0
): Promise<boolean> {
  const guildId = getGuildId();
  const token = getBotToken();
  const url = `${DISCORD_API_BASE}/guilds/${guildId}/bans/${userId}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : {}),
    },
    body: JSON.stringify({
      delete_message_seconds: deleteMessageSeconds,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Ban Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return true;
}

/**
 * Unbans a user from the guild.
 */
export async function unbanGuildMember(userId: string, reason?: string): Promise<boolean> {
  const guildId = getGuildId();
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
 * Times out (mutes) a member for a given duration in seconds. Set to null/0 to remove timeout.
 */
export async function timeoutGuildMember(
  userId: string,
  durationSeconds: number | null,
  reason?: string
): Promise<boolean> {
  const guildId = getGuildId();
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
    body: JSON.stringify({
      communication_disabled_until: communicationDisabledUntil,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Discord Timeout Error [${res.status}]: ${errorText || res.statusText}`);
  }

  return true;
}

/**
 * Sends a Direct Message to a Discord user via DM channel creation.
 */
export async function sendDirectMessage(
  userId: string,
  content?: string,
  embeds?: object[]
): Promise<Record<string, any>> {
  // Step 1: Create DM Channel
  const dmChannel = await discordFetch<{ id: string }>('/users/@me/channels', {
    method: 'POST',
    body: JSON.stringify({ recipient_id: userId }),
  });

  // Step 2: Send Message in DM Channel
  return sendChannelMessage(dmChannel.id, content, embeds);
}
