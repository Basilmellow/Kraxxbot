// KRAXX Operations Platform — Server-Side Permission & Authorization Layer
// Multi-tenant: per-guild access control, IDOR defense, session validation

import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { fetchUserGuilds } from './discord';
import { prisma } from './prisma';

export { RoleTier } from './constants';
export * from './constants';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type PermissionCheck = {
  authorized: boolean;
  reason?: string;
  error?: string;
  status: number;
  session?: any;
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
 * 2. Guild exists in database with botInstalled = true
 * 3. User has MANAGE_GUILD or ADMINISTRATOR permissions in that Discord server
 *
 * Prevents IDOR: a user cannot access guild data by simply guessing the guildId URL.
 */
export async function requireGuildAccess(guildId: string): Promise<PermissionCheck> {
  // 1. Validate session
  const session = await getServerSession(authOptions);

  if (!session?.user?.accessToken) {
    return {
      authorized: false,
      reason: 'Not authenticated. Please log in with Discord.',
      error: 'Unauthorized',
      status: 401,
    };
  }

  // 2. Verify the guild exists in DB with bot installed
  try {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      return {
        authorized: false,
        reason: 'This server has not been set up with KRAXXBot.',
        error: 'Guild not found',
        status: 404,
      };
    }

    if (!guild.botInstalled) {
      return {
        authorized: false,
        reason: 'KRAXXBot has been removed from this server.',
        error: 'Bot not installed',
        status: 403,
      };
    }
  } catch {
    return {
      authorized: false,
      reason: 'Unable to verify server access.',
      error: 'Database error',
      status: 500,
    };
  }

  // 3. Verify user has manage permissions in this guild via Discord API
  try {
    const managedGuilds = await fetchUserGuilds(session.user.accessToken as string);
    const hasAccess = managedGuilds.some(g => g.id === guildId);

    if (!hasAccess) {
      return {
        authorized: false,
        reason: 'You do not have permission to manage this server.',
        error: 'Forbidden: Insufficient guild permissions',
        status: 403,
      };
    }
  } catch {
    // If Discord API is down, deny access for security
    return {
      authorized: false,
      reason: 'Unable to verify Discord guild permissions. Please try again.',
      error: 'Discord API unavailable',
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
 * Lightweight session check — just verifies the user is logged in.
 * Use for routes that don't require guild-level isolation.
 */
export async function requireAuth(): Promise<PermissionCheck> {
  const session = await getServerSession(authOptions);

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
// Legacy HQ-Specific Tier Checks (preserved for backward compat)
// These are KRAXX HQ internal checks — not used for multi-tenant routes
// ─────────────────────────────────────────────────────────────────

import { RoleTier as RT, ROLE_TIER_LABELS } from './constants';
import { resolveRoleTier, getRoleTierName } from './permissions-legacy';

export { resolveRoleTier, getRoleTierName };

export function isDashboardAuthorized(tier?: RT | number): boolean {
  if (tier === undefined || tier === null) return false;
  return tier >= RT.MANAGEMENT_HEAD;
}

export function hasMinimumTier(userTier: RT, requiredTier: RT): boolean {
  return userTier >= requiredTier;
}

export function isManagement(tier: RT): boolean {
  return tier >= RT.MANAGEMENT_HEAD;
}

export function isFounder(tier: RT): boolean {
  return tier >= RT.COFOUNDER;
}

export function canSendMessages(tier?: RT): boolean {
  return tier !== undefined && tier >= RT.MANAGEMENT_HEAD;
}

export function canEditMessages(tier?: RT): boolean {
  return tier !== undefined && tier >= RT.MANAGEMENT_HEAD;
}

export function canDeleteMessages(tier?: RT): boolean {
  return tier !== undefined && tier >= RT.MANAGEMENT_HEAD;
}

export function canMentionMass(tier?: RT): boolean {
  return tier !== undefined && tier >= RT.MANAGEMENT_HEAD;
}

export function canManageTemplates(tier?: RT): boolean {
  return tier !== undefined && tier >= RT.MANAGEMENT_HEAD;
}

export function canScheduleAnnouncements(tier?: RT): boolean {
  return tier !== undefined && tier >= RT.MANAGEMENT_HEAD;
}

/** @deprecated Use requireGuildAccess() for multi-tenant routes. */
export function requireTier(
  sessionOrTier: any,
  requiredTier: RT = RT.MANAGEMENT_HEAD
): PermissionCheck {
  let userTier: RT | undefined = undefined;
  let isMember: boolean | undefined = undefined;

  if (typeof sessionOrTier === 'number') {
    userTier = sessionOrTier;
  } else if (sessionOrTier && typeof sessionOrTier === 'object') {
    userTier = sessionOrTier.user?.roleTier ?? sessionOrTier.roleTier;
    isMember = sessionOrTier.user?.isMember ?? sessionOrTier.isMember;
  }

  if (userTier === undefined) {
    if (process.env.NODE_ENV === 'development') {
      return { authorized: true, status: 200 };
    }
    return {
      authorized: false,
      reason: 'No authenticated session found. Please log in with Discord.',
      error: 'Unauthorized: Session missing or expired',
      status: 401,
    };
  }

  if (isMember === false) {
    return {
      authorized: false,
      reason: 'Access Denied: Discord account is not a verified member of KRAXX HQ guild.',
      error: 'Forbidden: Guild membership required',
      status: 403,
    };
  }

  const effectiveMinTier = Math.max(requiredTier, RT.MANAGEMENT_HEAD);

  if (userTier < effectiveMinTier) {
    const tierName = ROLE_TIER_LABELS[getRoleTierName(userTier)] || getRoleTierName(userTier);
    const reqName = ROLE_TIER_LABELS[getRoleTierName(effectiveMinTier)] || getRoleTierName(effectiveMinTier);
    const reason = `Access Denied. Required: ${reqName}. Your tier: ${tierName}.`;
    return { authorized: false, reason, error: reason, status: 403 };
  }

  return { authorized: true, status: 200 };
}

/** @deprecated Use requireGuildAccess() for multi-tenant routes. */
export function requireDashboardAccess(session: any): PermissionCheck {
  return requireTier(session, RT.MANAGEMENT_HEAD);
}
