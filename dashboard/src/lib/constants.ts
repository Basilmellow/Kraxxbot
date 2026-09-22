// KRAXXBot Web Dashboard — Shared Constants
// Multi-tenant public SaaS. No KRAXX HQ internal roles.

// ─────────────────────────────────────────────────────────────────
// Design Tokens (mirrors globals.css custom properties)
// ─────────────────────────────────────────────────────────────────
export const KRAXXBOT_COLORS = {
  BG: '#090908',
  SURFACE_1: '#161614',
  SURFACE_2: '#1D1C19',
  BORDER: '#2A2925',
  ACCENT: '#C9A66B',
  ACCENT_HOVER: '#D8B77D',
  TEXT_PRIMARY: '#F3F0E9',
  TEXT_SECONDARY: '#A8A49B',
  TEXT_MUTED: '#716D65',
  SUCCESS: '#22C55E',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
  DISCORD_BLUE: '#5865F2',
} as const;

export const KRAXX_COLORS = KRAXXBOT_COLORS;

// Public KRAXX ecosystem destinations. Reuse these for public site links.
export const KRAXXBOT_SUPPORT_SERVER_URL = 'https://discord.gg/uyKjpQy9JZ';
export const KRAXX_STUDIO_URL = 'https://kraxxstudio.com';
export const KRAXXSEC_URL = 'https://kraxxsec.com';

// ─────────────────────────────────────────────────────────────────
// Permission Tier
// Used by dashboard permission checks — mirrors PermissionTier in
// src/config/roles.ts on the bot side.
// ─────────────────────────────────────────────────────────────────
export enum PermissionTier {
  ADMINISTRATOR = 100,
  MANAGER = 80,
  MODERATOR = 60,
  SUPPORT = 40,
  MEMBER = 10,
  NONE = 0,
}

export const PERMISSION_TIER_LABELS: Record<string, string> = {
  ADMINISTRATOR: 'Server Administrator',
  MANAGER: 'Server Manager',
  MODERATOR: 'Moderator',
  SUPPORT: 'Support Staff',
  MEMBER: 'Member',
  NONE: 'None',
};

// ─────────────────────────────────────────────────────────────────
// Dashboard Navigation
// ─────────────────────────────────────────────────────────────────
export interface DashboardModuleItem {
  id: string;
  label: string;
  icon: string;
  href: string;         // relative href, e.g. '/tickets' — prepended with /dashboard/[guildId]
  category: 'OVERVIEW' | 'MODERATION' | 'SUPPORT' | 'COMMUNITY' | 'AUTOMATION' | 'INSIGHTS' | 'SYSTEM';
}

export const DASHBOARD_MODULES: DashboardModuleItem[] = [
  // OVERVIEW
  { id: 'overview', label: 'Dashboard', icon: 'LayoutDashboard', href: '', category: 'OVERVIEW' },
  { id: 'select-server', label: 'Servers', icon: 'Server', href: '/select-server', category: 'OVERVIEW' },

  // MODERATION
  { id: 'moderation', label: 'Moderation', icon: 'Shield', href: '/moderation', category: 'MODERATION' },
  { id: 'members', label: 'Members', icon: 'Users', href: '/members', category: 'MODERATION' },
  { id: 'roles', label: 'Roles', icon: 'ShieldAlert', href: '/roles', category: 'MODERATION' },

  // SUPPORT
  { id: 'tickets', label: 'Tickets', icon: 'Ticket', href: '/tickets', category: 'SUPPORT' },

  // COMMUNITY
  { id: 'welcome', label: 'Welcome', icon: 'DoorOpen', href: '/welcome', category: 'COMMUNITY' },
  { id: 'announcements', label: 'Announcements', icon: 'Megaphone', href: '/announcements', category: 'COMMUNITY' },
  { id: 'messages', label: 'Embeds', icon: 'Sparkles', href: '/messages', category: 'COMMUNITY' },

  // AUTOMATION
  { id: 'tasks', label: 'Tasks', icon: 'CheckSquare', href: '/tasks', category: 'AUTOMATION' },
  { id: 'reminders', label: 'Reminders', icon: 'AlarmClock', href: '/reminders', category: 'AUTOMATION' },
  { id: 'automation', label: 'Automations', icon: 'Zap', href: '/automation', category: 'AUTOMATION' },

  // INSIGHTS
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', href: '/analytics', category: 'INSIGHTS' },
  { id: 'audit', label: 'Audit Logs', icon: 'ScrollText', href: '/audit', category: 'INSIGHTS' },

  // SYSTEM
  { id: 'settings', label: 'Settings', icon: 'Settings', href: '/settings', category: 'SYSTEM' },
  { id: 'modules', label: 'Modules', icon: 'Boxes', href: '/modules', category: 'SYSTEM' },
];

export const CATEGORY_LABELS: Record<DashboardModuleItem['category'], string> = {
  OVERVIEW: 'Overview',
  MODERATION: 'Moderation',
  SUPPORT: 'Support',
  COMMUNITY: 'Community',
  AUTOMATION: 'Automation',
  INSIGHTS: 'Insights',
  SYSTEM: 'System',
};

// ─────────────────────────────────────────────────────────────────
// Data Constants
// ─────────────────────────────────────────────────────────────────
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const TICKET_STATUSES = ['OPEN', 'CLAIMED', 'WAITING', 'RESOLVED', 'CLOSED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const MOD_ACTIONS = ['WARN', 'TIMEOUT', 'KICK', 'BAN', 'UNBAN'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ModAction = (typeof MOD_ACTIONS)[number];

// ─────────────────────────────────────────────────────────────────
// Legacy Backward-Compatibility Exports
// These map old KRAXX HQ role names → PermissionTier values so that
// existing API routes and pages don't need to be bulk-updated.
// TODO: migrate all call-sites to PermissionTier directly.
// ─────────────────────────────────────────────────────────────────
export const RoleTier = {
  ...PermissionTier,
  // Old KRAXX HQ internal role names → nearest PermissionTier equivalent
  FOUNDER:          PermissionTier.ADMINISTRATOR,
  COFOUNDER:        PermissionTier.ADMINISTRATOR,
  MANAGEMENT_HEAD:  PermissionTier.MANAGER,
  TEAM_LEAD:        PermissionTier.MODERATOR,
  PARTNER:          PermissionTier.MODERATOR,
  DIVISION_MEMBER:  PermissionTier.SUPPORT,
  STAFF:            PermissionTier.SUPPORT,
  CLIENT:           PermissionTier.MEMBER,
  USER:             PermissionTier.MEMBER,
} as const;

export type RoleTier = PermissionTier;

export const ROLE_TIER_LABELS = PERMISSION_TIER_LABELS;
