import { RoleTier } from './constants';

export { RoleTier } from './constants';

// Minimum clearance tier permitted to access any KRAXX HQ dashboard route or API
export const DASHBOARD_MIN_TIER = RoleTier.MANAGEMENT_HEAD; // 80

// Only these three tiers have access to KRAXX HQ Operations Dashboard
export const ALLOWED_DASHBOARD_TIERS: readonly RoleTier[] = [
  RoleTier.FOUNDER,         // 100
  RoleTier.COFOUNDER,       // 90
  RoleTier.MANAGEMENT_HEAD, // 80
] as const;

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
 * Checks if the user is authorized to access the KRAXX Operations Dashboard.
 * Strictly limited to FOUNDER, COFOUNDER, and MANAGEMENT_HEAD.
 */
export function isDashboardAuthorized(tier?: RoleTier | number): boolean {
  if (tier === undefined || tier === null) return false;
  return tier >= RoleTier.MANAGEMENT_HEAD;
}

/**
 * Checks if the given tier meets the minimum required tier.
 */
export function hasMinimumTier(userTier: RoleTier, requiredTier: RoleTier): boolean {
  return userTier >= requiredTier;
}

/**
 * Checks if the user is at least Management Head.
 */
export function isManagement(tier: RoleTier): boolean {
  return tier >= RoleTier.MANAGEMENT_HEAD;
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
 * Enforces both Discord Guild membership AND strict Role Tier verification (Min: MANAGEMENT_HEAD).
 */
export function requireTier(
  sessionOrTier: any,
  requiredTier: RoleTier = RoleTier.MANAGEMENT_HEAD
): PermissionCheck {
  let userTier: RoleTier | undefined = undefined;
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

  // Dashboard minimum requirement is always at least MANAGEMENT_HEAD
  const effectiveMinTier = Math.max(requiredTier, RoleTier.MANAGEMENT_HEAD);

  if (userTier < effectiveMinTier) {
    const reason = `Access Denied. Operations Dashboard is strictly restricted to Founder, Co-Founder, and Management Head. (Required: ${getRoleTierName(effectiveMinTier)}, Your Tier: ${getRoleTierName(userTier)}).`;
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
 * Quick helper for general dashboard route protection.
 */
export function requireDashboardAccess(session: any): PermissionCheck {
  return requireTier(session, RoleTier.MANAGEMENT_HEAD);
}

/**
 * Action-specific permissions for Management/Founder
 */
export function canSendMessages(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.MANAGEMENT_HEAD;
}

export function canEditMessages(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.MANAGEMENT_HEAD;
}

export function canDeleteMessages(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.MANAGEMENT_HEAD;
}

export function canMentionMass(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.MANAGEMENT_HEAD;
}

export function canManageTemplates(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.MANAGEMENT_HEAD;
}

export function canScheduleAnnouncements(tier?: RoleTier): boolean {
  return tier !== undefined && tier >= RoleTier.MANAGEMENT_HEAD;
}
