// Legacy KRAXX HQ role tier resolution — preserved from original permissions.ts
// Only used for internal KRAXX HQ operations dashboard routes

import { RoleTier } from './constants';

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

export function resolveRoleTier(roleIds: string[]): RoleTier {
  initRoleTierMap();

  let highestTier: RoleTier = RoleTier.USER;

  for (const roleId of roleIds) {
    const tier = ROLE_TIER_MAP[roleId];
    if (tier !== undefined && (tier as number) > (highestTier as number)) {
      highestTier = tier;
    }
  }

  return highestTier;
}

export function getRoleTierName(tier: RoleTier): string {
  const entries = Object.entries(RoleTier).filter(
    ([, value]) => typeof value === 'number'
  ) as [string, number][];

  const match = entries.find(([, value]) => value === tier);
  return match ? match[0] : 'USER';
}
