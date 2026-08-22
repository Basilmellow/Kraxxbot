// KRAXX HQ Operations Platform — Shared Constants

export const KRAXX_COLORS = {
  BRAND: '#22D3EE',         // Electric Cyan / Primary Brand Accent
  BRAND_MUTED: '#0891B2',
  BRAND_GLOW: 'rgba(34, 211, 238, 0.15)',
  SECURITY: '#10B981',      // Emerald Green / KRAXXSEC
  STUDIO: '#818CF8',        // Indigo Lavender / KRAXX STUDIO
  NEUTRAL: '#38BDF8',       // Blue / Operations
  WARNING: '#F59E0B',       // Amber
  DANGER: '#EF4444',        // Red
  DARK: '#05070B',          // Background
  DARK_SURFACE: '#0A0F16',  // Surface 1
  DARK_SURFACE_2: '#0D131C',// Surface 2
  DARK_CARD: '#111823',     // Card Surface
  DARK_BORDER: '#16202E',   // Subtle Border
  DARK_BORDER_HOVER: '#1E2C3F',
  TEXT_PRIMARY: '#F1F5F9',
  TEXT_SECONDARY: '#94A3B8',
  TEXT_MUTED: '#64748B',
} as const;

// Must exactly mirror src/config/roles.ts RoleTier
export enum RoleTier {
  FOUNDER = 100,
  COFOUNDER = 90,
  MANAGEMENT_HEAD = 80,
  TEAM_LEAD = 70,
  PARTNER = 60,
  DIVISION_MEMBER = 40,
  STAFF = 30,
  CLIENT = 20,
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
  STAFF: 'Staff',
  CLIENT: 'Client',
  USER: 'User',
};

export interface DashboardModuleItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  tier: RoleTier;
  category: 'COMMAND' | 'COMMUNICATION' | 'PEOPLE' | 'OPERATIONS' | 'COMMUNITY' | 'SYSTEM';
}

// Full Platform Navigation Structure — KRAXX HQ Command Categories
export const DASHBOARD_MODULES: DashboardModuleItem[] = [
  // COMMAND
  { id: 'overview', label: 'Command Center', icon: 'LayoutDashboard', href: '/dashboard', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMAND' },
  { id: 'search', label: 'Global Search', icon: 'Search', href: '/dashboard/search', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMAND' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell', href: '/dashboard/notifications', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMAND' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', href: '/dashboard/analytics', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMAND' },
  { id: 'audit', label: 'Audit Logs', icon: 'ScrollText', href: '/dashboard/audit', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMAND' },

  // COMMUNICATION
  { id: 'messages', label: 'Message Center', icon: 'MessageSquare', href: '/dashboard/messages', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNICATION' },
  { id: 'embed', label: 'Embed Builder', icon: 'Sparkles', href: '/dashboard/messages/embed', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNICATION' },
  { id: 'templates', label: 'Templates', icon: 'Layers', href: '/dashboard/messages/templates', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNICATION' },
  { id: 'announcements', label: 'Announcements', icon: 'Megaphone', href: '/dashboard/announcements', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNICATION' },
  { id: 'scheduled', label: 'Scheduled Queue', icon: 'Clock', href: '/dashboard/announcements/scheduled', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNICATION' },

  // PEOPLE & ACCESS
  { id: 'members', label: 'Members', icon: 'Users', href: '/dashboard/members', tier: RoleTier.MANAGEMENT_HEAD, category: 'PEOPLE' },
  { id: 'roles', label: 'Role Hierarchy', icon: 'ShieldAlert', href: '/dashboard/roles', tier: RoleTier.MANAGEMENT_HEAD, category: 'PEOPLE' },
  { id: 'tickets', label: 'Tickets', icon: 'Ticket', href: '/dashboard/tickets', tier: RoleTier.MANAGEMENT_HEAD, category: 'PEOPLE' },
  { id: 'moderation', label: 'Moderation', icon: 'Shield', href: '/dashboard/moderation', tier: RoleTier.MANAGEMENT_HEAD, category: 'PEOPLE' },

  // OPERATIONS
  { id: 'tasks', label: 'Tasks', icon: 'CheckSquare', href: '/dashboard/tasks', tier: RoleTier.MANAGEMENT_HEAD, category: 'OPERATIONS' },
  { id: 'reminders', label: 'Reminders', icon: 'AlarmClock', href: '/dashboard/reminders', tier: RoleTier.MANAGEMENT_HEAD, category: 'OPERATIONS' },
  { id: 'meetings', label: 'Meetings', icon: 'CalendarClock', href: '/dashboard/meetings', tier: RoleTier.MANAGEMENT_HEAD, category: 'OPERATIONS' },
  { id: 'automation', label: 'Automation Engine', icon: 'Zap', href: '/dashboard/automation', tier: RoleTier.MANAGEMENT_HEAD, category: 'OPERATIONS' },

  // COMMUNITY
  { id: 'welcome', label: 'Welcome System', icon: 'DoorOpen', href: '/dashboard/welcome', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNITY' },
  { id: 'social', label: 'Social & Polls', icon: 'Vote', href: '/dashboard/social', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNITY' },
  { id: 'fun', label: 'Entertainment', icon: 'Gamepad2', href: '/dashboard/fun', tier: RoleTier.MANAGEMENT_HEAD, category: 'COMMUNITY' },

  // SYSTEM
  { id: 'tools', label: 'Server Utilities', icon: 'Wrench', href: '/dashboard/tools', tier: RoleTier.MANAGEMENT_HEAD, category: 'SYSTEM' },
  { id: 'modules', label: 'Module Control', icon: 'Boxes', href: '/dashboard/modules', tier: RoleTier.MANAGEMENT_HEAD, category: 'SYSTEM' },
  { id: 'settings', label: 'Settings', icon: 'Settings', href: '/dashboard/settings', tier: RoleTier.FOUNDER, category: 'SYSTEM' },
];

// Status indicators
export const STATUS_COLORS = {
  ONLINE: '#10B981',
  OFFLINE: '#EF4444',
  DEGRADED: '#F59E0B',
  UNKNOWN: '#64748B',
} as const;

// Departments / Divisions
export const DEPARTMENTS = ['GENERAL', 'KRAXXSEC', 'KRAXX_STUDIO'] as const;
export type Department = (typeof DEPARTMENTS)[number];

// Task/Ticket statuses
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export const TICKET_STATUSES = ['OPEN', 'CLAIMED', 'CLOSED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
