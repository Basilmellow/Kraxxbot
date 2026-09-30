import { getDiscordAccessToken } from '@/lib/server-session';
// KRAXX Operations Platform — Server-Side Permission & Authorization Layer
// Multi-tenant: per-guild access control, IDOR defense, session validation

import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { fetchUserGuilds,isBotInstalledInGuild } from './discord';
import { prisma } from './prisma';

export * from './constants';
export { RoleTier } from './constants';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type PermissionCheck = {
  authorized: boolean;
  reason?: string;
  error?: string;
  status: number;
  session?: Session;
  guildId?: string;
};

// ─────────────────────────────────────────────────────────────────
// Multi-Tenant Guild Authorization
// ─────────────────────────────────────────────────────────────────

/**
 * Primary server-side security gate for all guild-scoped API routes and pages.
 *
 * Checks (in order):
 * 1. Valid authenticated session exists
 * 2. User has MANAGE_GUILD or ADMINISTRATOR permissions in that Discord server
 * 3. KRAXXBot is currently installed, verified with Discord's bot REST API
 * 4. A durable, active Guild record exists for configuration and tenant data
 *
 * Prevents IDOR: a user cannot access guild data by simply guessing the guildId URL.
 */
export async function requireGuildAccess(guildId: string): Promise<PermissionCheck> {
  // 1. Validate session
  const session = await getServerSession(authOptions);
  const serverAccessToken = await getDiscordAccessToken();

  if (!session?.user?.discordId || !serverAccessToken) {
    return {
      authorized: false,
      reason: 'Not authenticated. Please log in with Discord.',
      error: 'Unauthorized',
      status: 401,
    };
  }

  // 2. Verify user membership and management permission before trusting the
  // requested guild id or making a bot-token request for it.
  try {
    const managedGuilds = await fetchUserGuilds(serverAccessToken!);
    const hasAccess = managedGuilds.some((guild) => guild.id === guildId);

    if (!hasAccess) {
      return {
        authorized: false,
        reason: 'You do not have permission to manage this server.',
        error: 'Forbidden: Insufficient guild permissions',
        status: 403,
      };
    }
  } catch {
    return {
      authorized: false,
      reason: 'Unable to verify Discord guild permissions. Please try again.',
      error: 'Discord API unavailable',
      status: 503,
    };
  }

  // 3. Verify live bot membership separately from worker/heartbeat state.
  try {
    const installed = await isBotInstalledInGuild(guildId);
    if (!installed) {
      return {
        authorized: false,
        reason: 'KRAXXBot is not installed in this server.',
        error: 'Bot not installed',
        status: 403,
      };
    }
  } catch {
    return {
      authorized: false,
      reason: 'Unable to verify KRAXXBot installation. Please try again.',
      error: 'Discord API unavailable',
      status: 503,
    };
  }

  // 4. Require an existing tenant record. Authorization must never initialize
  // or mutate tenant state; new installations use the explicit sync workflow.
  try {
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild || !guild.botInstalled) {
      return {
        authorized: false,
        reason: 'This server is installed but has not been synchronized with the dashboard yet.',
        error: 'Guild synchronization required',
        status: 409,
      };
    }
  } catch {
    return {
      authorized: false,
      reason: 'Unable to verify this server’s dashboard registration. Please try again.',
      error: 'Guild registration check failed',
      status: 503,
    };
  }

  return {
    authorized: true,
    status: 200,
    session,
    guildId,
  };
}

/**
 * Read-only authorization for guild route layouts. Like requireGuildAccess,
 * this checks existing state and never initializes tenant records.
 */
export async function requireGuildPageAccess(guildId: string): Promise<PermissionCheck> {
  const session = await getServerSession(authOptions);
  const serverAccessToken = await getDiscordAccessToken();

  if (!session?.user?.discordId || !serverAccessToken) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  try {
    const managedGuilds = await fetchUserGuilds(serverAccessToken!);

    if (!managedGuilds.some((guildItem) => guildItem.id === guildId)) {
      return { authorized: false, error: 'Forbidden', status: 404 };
    }

    const installed = await isBotInstalledInGuild(guildId);
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { id: true, botInstalled: true },
    });

    if (!installed || !guild?.botInstalled) {
      return { authorized: false, error: 'Guild unavailable', status: 404 };
    }

    return { authorized: true, status: 200, session, guildId };
  } catch {
    return { authorized: false, error: 'Guild access could not be verified', status: 503 };
  }
}

/**
 * Lightweight session check — just verifies the user is logged in.
 * Use for routes that don't require guild-level isolation.
 */
export async function requireAuth(): Promise<PermissionCheck> {
  const session = await getServerSession(authOptions);
  const serverAccessToken = await getDiscordAccessToken();

  if (!session?.user) {
    return {
      authorized: false,
      reason: 'Not authenticated. Please log in with Discord.',
      error: 'Unauthorized',
      status: 401,
    };
  }

  return { authorized: true, status: 200, session };
}

// ─────────────────────────────────────────────────────────────────
