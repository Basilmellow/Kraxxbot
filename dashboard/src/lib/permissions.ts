import { RoleTier } from './constants';

export { RoleTier } from './constants';

// Role ID → RoleTier mapping (populated from env vars at runtime)
const ROLE_TIER_MAP: Record<string, RoleTier> = {};

function initRoleTierMap() {
  if (Object.keys(ROLE_TIER_MAP).length > 0) return;

  const mappings: [string | undefined, RoleTier][] = [
    [process.env.FOUNDER_ROLE_ID, RoleTier.FOUNDER],
    [process.env.COFOUNDER_ROLE_ID, RoleTier.COFOUNDER],
    [process.env.MANAGEMENT_ROLE_ID, RoleTier.MANAGEMENT_HEAD],
    [process.env.TEAM_LEAD_ROLE_ID, RoleTier.TEAM_LEAD],
    [process.env.PARTNER_ROLE_ID, RoleTier.PARTNER],
    [process.env.KRAXXSEC_ROLE_ID, RoleTier.DIVISION_MEMBER],
    [process.env.KRAXXSTUDIO_ROLE_ID, RoleTier.DIVISION_MEMBER],
    [process.env.CLIENT_ROLE_ID, RoleTier.CLIENT],
    [process.env.USER_ROLE_ID, RoleTier.USER],
  ];

  for (const [roleId, tier] of mappings) {
    if (roleId && roleId.trim().length > 0) {
      ROLE_TIER_MAP[roleId] = tier;
    }
  }
}

/**
 * Resolves the highest RoleTier from a list of Discord role IDs.
 * Returns the highest tier found, or USER as default.
 */
export function resolveRoleTier(roleIds: string[]): RoleTier {
  initRoleTierMap();

  let highestTier = RoleTier.USER;

  for (const roleId of roleIds) {
    const tier = ROLE_TIER_MAP[roleId];
    if (tier !== undefined && tier > highestTier) {
      highestTier = tier;
    }
  }

  return highestTier;
}

/**
 * Returns the RoleTier name string for a given numeric tier value.
 */
export function getRoleTierName(tier: RoleTier): string {
  const entries = Object.entries(RoleTier).filter(
    ([, value]) => typeof value === 'number'
  ) as [string, number][];

  const match = entries.find(([, value]) => value === tier);
  return match ? match[0] : 'USER';
}

/**
 * Checks if the given tier meets the minimum required tier.
 */
export function hasMinimumTier(userTier: RoleTier, requiredTier: RoleTier): boolean {
  return userTier >= requiredTier;
}

/**
 * Checks if the user is at least Management Head (can access admin features).
 */
export function isManagement(tier: RoleTier): boolean {
  return tier >= RoleTier.MANAGEMENT_HEAD;
}

/**
 * Checks if the user is at least Team Lead (can access operational features).
 */
export function isOperator(tier: RoleTier): boolean {
  return tier >= RoleTier.TEAM_LEAD;
}

/**
 * Checks if the user is Founder or Co-Founder.
 */
export function isFounder(tier: RoleTier): boolean {
  return tier >= RoleTier.COFOUNDER;
}

export type PermissionCheck = {
  authorized: boolean;
  reason?: string;
  error?: string;
  status: number;
};

/**
 * Server-side permission gate for API routes.
 * Accepts Session, user object, or RoleTier.
 */
export function requireTier(
  sessionOrTier: any,
  requiredTier: RoleTier
): PermissionCheck {
  let userTier: RoleTier | undefined = undefined;

  if (typeof sessionOrTier === 'number') {
    userTier = sessionOrTier;
  } else if (sessionOrTier && typeof sessionOrTier === 'object') {
    userTier = sessionOrTier.user?.roleTier ?? sessionOrTier.roleTier;
  }

  if (userTier === undefined) {
    return {
      authorized: false,
      reason: 'No session found. Please log in.',
      error: 'Unauthorized: Session missing or expired',
      status: 401,
    };
  }

  if (userTier < requiredTier) {
    const reason = `Insufficient permissions. Required: ${getRoleTierName(requiredTier)}, your tier: ${getRoleTierName(userTier)}.`;
    return {
      authorized: false,
      reason,
      error: reason,
      status: 403,
    };
  }

  return { authorized: true, status: 200 };
}

/**
 * Phase 2 Communication Permissions
 */
export function canSendMessages(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.TEAM_LEAD;
}

export function canEditMessages(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.TEAM_LEAD;
}

export function canDeleteMessages(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.MANAGEMENT_HEAD;
}

export function canMentionMass(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.MANAGEMENT_HEAD;
}

export function canManageTemplates(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.TEAM_LEAD;
}

export function canScheduleAnnouncements(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.TEAM_LEAD;
}
