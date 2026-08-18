import { GuildMember } from 'discord.js';
import { env } from './environment';

export enum RoleTier {
  FOUNDER = 100,
  COFOUNDER = 90,
  MANAGEMENT_HEAD = 80,
  TEAM_LEAD = 70,
  PARTNER = 60,
  DIVISION_STAFF = 50,
  CLIENT = 20,
  USER = 10,
  NONE = 0,
}

export interface RoleConfig {
  key: string;
  name: string;
  id: string;
  priority: RoleTier;
  description: string;
}

export const ORGANIZATIONAL_ROLES: Record<string, RoleConfig> = {
  FOUNDER: {
    key: 'FOUNDER',
    name: 'Founder',
    id: env.FOUNDER_ROLE_ID,
    priority: RoleTier.FOUNDER,
    description: 'Executive Organization Founder',
  },
  COFOUNDER: {
    key: 'COFOUNDER',
    name: 'Co-Founder',
    id: env.COFOUNDER_ROLE_ID,
    priority: RoleTier.COFOUNDER,
    description: 'Executive Co-Founder',
  },
  MANAGEMENT_HEAD: {
    key: 'MANAGEMENT_HEAD',
    name: 'Management Head',
    id: env.MANAGEMENT_ROLE_ID,
    priority: RoleTier.MANAGEMENT_HEAD,
    description: 'Department & Operational Management',
  },
  TEAM_LEAD: {
    key: 'TEAM_LEAD',
    name: 'Team Lead',
    id: env.TEAM_LEAD_ROLE_ID,
    priority: RoleTier.TEAM_LEAD,
    description: 'Project & Operations Team Lead',
  },
  PARTNER: {
    key: 'PARTNER',
    name: 'Partner',
    id: env.PARTNER_ROLE_ID,
    priority: RoleTier.PARTNER,
    description: 'External Strategic Partner',
  },
  KRAXXSEC: {
    key: 'KRAXXSEC',
    name: 'Team KRAXXSEC',
    id: env.KRAXXSEC_ROLE_ID,
    priority: RoleTier.DIVISION_STAFF,
    description: 'Cybersecurity & Security Engineering Team',
  },
  KRAXXSTUDIO: {
    key: 'KRAXXSTUDIO',
    name: 'Team KRAXX STUDIO',
    id: env.KRAXXSTUDIO_ROLE_ID,
    priority: RoleTier.DIVISION_STAFF,
    description: 'Digital Creative & Technology Services Team',
  },
  CLIENT: {
    key: 'CLIENT',
    name: 'Client',
    id: env.CLIENT_ROLE_ID,
    priority: RoleTier.CLIENT,
    description: 'KRAXX Client / Customer',
  },
  USER: {
    key: 'USER',
    name: 'User',
    id: env.USER_ROLE_ID,
    priority: RoleTier.USER,
    description: 'Verified KRAXX HQ Base Member',
  },
  BOT: {
    key: 'BOT',
    name: 'KRAXX Bot',
    id: env.KRAXX_BOT_ROLE_ID,
    priority: RoleTier.FOUNDER,
    description: 'Internal Operations Automation Bot',
  },
};

/**
 * Resolves the highest organizational role tier for a given GuildMember.
 */
export function getMemberHighestTier(member: GuildMember): RoleTier {
  let maxTier = RoleTier.NONE;

  for (const roleConfig of Object.values(ORGANIZATIONAL_ROLES)) {
    if (roleConfig.id && member.roles.cache.has(roleConfig.id)) {
      if (roleConfig.priority > maxTier) {
        maxTier = roleConfig.priority;
      }
    }
  }

  // Fallback: If user has Administrator permission, grant Founder tier
  if (member.permissions.has('Administrator')) {
    return RoleTier.FOUNDER;
  }

  return maxTier;
}

/**
 * Checks if a member possesses management authority (Management Head or higher).
 */
export function isManagement(member: GuildMember): boolean {
  return getMemberHighestTier(member) >= RoleTier.MANAGEMENT_HEAD;
}

/**
 * Checks if a member is authorized for ticket management.
 * Strictly limited to: Founder, Co-Founder, and Management Head roles.
 */
export function isTicketManager(member: GuildMember): boolean {
  if (!member || !member.roles) return false;

  // Direct role ID checks from configured environment variables
  if (
    (env.FOUNDER_ROLE_ID && env.FOUNDER_ROLE_ID.trim() !== '' && member.roles.cache.has(env.FOUNDER_ROLE_ID)) ||
    (env.COFOUNDER_ROLE_ID && env.COFOUNDER_ROLE_ID.trim() !== '' && member.roles.cache.has(env.COFOUNDER_ROLE_ID)) ||
    (env.MANAGEMENT_ROLE_ID && env.MANAGEMENT_ROLE_ID.trim() !== '' && member.roles.cache.has(env.MANAGEMENT_ROLE_ID))
  ) {
    return true;
  }

  // Role tier check (FOUNDER = 100, COFOUNDER = 90, MANAGEMENT_HEAD = 80)
  const highestTier = getMemberHighestTier(member);
  if (highestTier >= RoleTier.MANAGEMENT_HEAD) {
    return true;
  }

  return false;
}

/**
 * Checks if a member has Team Lead authority or higher.
 */
export function isTeamLeadOrAbove(member: GuildMember): boolean {
  return getMemberHighestTier(member) >= RoleTier.TEAM_LEAD;
}

/**
 * Evaluates whether an executor can assign or remove a specific target role.
 * Enforces organizational hierarchy: An executor can only manage roles strictly lower than their tier.
 */
export function canManageRole(executor: GuildMember, targetRoleId: string): { allowed: boolean; reason?: string } {
  const executorTier = getMemberHighestTier(executor);

  // Target role configuration lookup
  const targetConfig = Object.values(ORGANIZATIONAL_ROLES).find(r => r.id === targetRoleId);
  const targetPriority = targetConfig ? targetConfig.priority : RoleTier.NONE;

  if (executorTier <= targetPriority) {
    return {
      allowed: false,
      reason: `Insufficient authority. Your tier (${executorTier}) must be strictly higher than the target role tier (${targetPriority}).`,
    };
  }

  return { allowed: true };
}
