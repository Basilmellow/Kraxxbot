// KRAXX Operations Platform — Shared Constants
// Mirrors the bot's design system and role hierarchy

export const KRAXX_COLORS = {
  BRAND: '#00f0ff',       // Cyber Aqua / Primary Brand
  BRAND_MUTED: '#00c4cc',
  SECURITY: '#10b981',    // Emerald Green / KRAXXSEC
  STUDIO: '#6366f1',      // Indigo / KRAXX STUDIO
  NEUTRAL: '#3b82f6',     // Corporate Blue
  WARNING: '#f59e0b',     // Amber Warning
  DANGER: '#ef4444',      // Crimson Error
  DARK: '#0b0e14',        // Dark Minimal
  DARK_SURFACE: '#0f1318',
  DARK_CARD: '#141a22',
  DARK_BORDER: '#1e2a38',
  DARK_HOVER: '#1a2332',
  TEXT_PRIMARY: '#e2e8f0',
  TEXT_SECONDARY: '#94a3b8',
  TEXT_MUTED: '#64748b',
} as const;

// Must exactly mirror src/config/roles.ts RoleTier
export enum RoleTier {
  FOUNDER = 100,
  COFOUNDER = 90,
  MANAGEMENT_HEAD = 80,
  TEAM_LEAD = 70,
  PARTNER = 60,
  DIVISION_MEMBER = 40,
  CLIENT = 20,
  STAFF = 30,
  USER = 10,
}

// Human-readable role tier labels
export const ROLE_TIER_LABELS: Record<string, string> = {
  FOUNDER: 'Founder',
  COFOUNDER: 'Co-Founder',
  MANAGEMENT_HEAD: 'Management Head',
  TEAM_LEAD: 'Team Lead',
  PARTNER: 'Partner',
  DIVISION_MEMBER: 'Division Member',
  CLIENT: 'Client',
  STAFF: 'Staff',
  USER: 'User',
};

export interface DashboardModuleItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  tier: RoleTier;
  category: 'CORE' | 'COMMUNICATION' | 'MANAGEMENT' | 'PRODUCTIVITY' | 'COMMUNITY' | 'SYSTEM';
}

// Full Platform Navigation Structure
export const DASHBOARD_MODULES: DashboardModuleItem[] = [
  // CORE
  { id: 'overview', label: 'Command Center', icon: 'LayoutDashboard', href: '/dashboard', tier: RoleTier.USER, category: 'CORE' },
  { id: 'search', label: 'Global Search', icon: 'Search', href: '/dashboard/search', tier: RoleTier.USER, category: 'CORE' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell', href: '/dashboard/notifications', tier: RoleTier.USER, category: 'CORE' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', href: '/dashboard/analytics', tier: RoleTier.TEAM_LEAD, category: 'CORE' },
  { id: 'audit', label: 'Audit Logs', icon: 'ScrollText', href: '/dashboard/audit', tier: RoleTier.TEAM_LEAD, category: 'CORE' },

  // COMMUNICATION
  { id: 'messages', label: 'Message Center', icon: 'MessageSquare', href: '/dashboard/messages', tier: RoleTier.TEAM_LEAD, category: 'COMMUNICATION' },
  { id: 'embed', label: 'Embed Builder', icon: 'Sparkles', href: '/dashboard/messages/embed', tier: RoleTier.TEAM_LEAD, category: 'COMMUNICATION' },
  { id: 'templates', label: 'Embed Templates', icon: 'Layers', href: '/dashboard/messages/templates', tier: RoleTier.TEAM_LEAD, category: 'COMMUNICATION' },
  { id: 'announcements', label: 'Announcements', icon: 'Megaphone', href: '/dashboard/announcements', tier: RoleTier.TEAM_LEAD, category: 'COMMUNICATION' },
  { id: 'scheduled', label: 'Scheduled Queue', icon: 'Clock', href: '/dashboard/announcements/scheduled', tier: RoleTier.TEAM_LEAD, category: 'COMMUNICATION' },
  { id: 'welcome', label: 'Welcome System', icon: 'DoorOpen', href: '/dashboard/welcome', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNICATION' },

  // MANAGEMENT
  { id: 'members', label: 'Members', icon: 'Users', href: '/dashboard/members', tier: RoleTier.TEAM_LEAD, category: 'MANAGEMENT' },
  { id: 'roles', label: 'Role Hierarchy', icon: 'ShieldAlert', href: '/dashboard/roles', tier: RoleTier.MANAGEMENT_HEAD, category: 'MANAGEMENT' },
  { id: 'tickets', label: 'Tickets', icon: 'Ticket', href: '/dashboard/tickets', tier: RoleTier.TEAM_LEAD, category: 'MANAGEMENT' },
  { id: 'moderation', label: 'Moderation', icon: 'Shield', href: '/dashboard/moderation', tier: RoleTier.MANAGEMENT_HEAD, category: 'MANAGEMENT' },

  // PRODUCTIVITY
  { id: 'tasks', label: 'Tasks', icon: 'CheckSquare', href: '/dashboard/tasks', tier: RoleTier.STAFF, category: 'PRODUCTIVITY' },
  { id: 'reminders', label: 'Reminders', icon: 'AlarmClock', href: '/dashboard/reminders', tier: RoleTier.STAFF, category: 'PRODUCTIVITY' },
  { id: 'meetings', label: 'Meetings', icon: 'CalendarClock', href: '/dashboard/meetings', tier: RoleTier.STAFF, category: 'PRODUCTIVITY' },
  { id: 'automation', label: 'Automation Engine', icon: 'Zap', href: '/dashboard/automation', tier: RoleTier.MANAGEMENT_HEAD, category: 'PRODUCTIVITY' },

  // COMMUNITY & UTILITIES
  { id: 'tools', label: 'Server Utilities', icon: 'Wrench', href: '/dashboard/tools', tier: RoleTier.USER, category: 'COMMUNITY' },
  { id: 'social', label: 'Social & Polls', icon: 'Vote', href: '/dashboard/social', tier: RoleTier.TEAM_LEAD, category: 'COMMUNITY' },
  { id: 'fun', label: 'Entertainment', icon: 'Gamepad2', href: '/dashboard/fun', tier: RoleTier.USER, category: 'COMMUNITY' },

  // SYSTEM
  { id: 'modules', label: 'Module Control', icon: 'Boxes', href: '/dashboard/modules', tier: RoleTier.MANAGEMENT_HEAD, category: 'SYSTEM' },
  { id: 'settings', label: 'Settings', icon: 'Settings', href: '/dashboard/settings', tier: RoleTier.FOUNDER, category: 'SYSTEM' },
];

// Status indicators
export const STATUS_COLORS = {
  ONLINE: '#10b981',
  OFFLINE: '#ef4444',
  DEGRADED: '#f59e0b',
  UNKNOWN: '#64748b',
} as const;

// Departments
export const DEPARTMENTS = ['GENERAL', 'KRAXXSEC', 'KRAXX_STUDIO'] as const;
export type Department = (typeof DEPARTMENTS)[number];

// Task/Ticket statuses
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const TICKET_STATUSES = ['OPEN', 'CLAIMED', 'CLOSED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
