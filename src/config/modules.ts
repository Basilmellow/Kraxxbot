export type ModuleKey =
  | 'tickets' | 'moderation' | 'welcome' | 'tasks' | 'reminders' | 'meetings'
  | 'embeds' | 'automation' | 'analytics' | 'logging' | 'announcements'
  | 'roles' | 'messaging' | 'members' | 'social' | 'entertainment' | 'utilities' | 'customCommands' | 'kraxx-ai';

export type ModuleOperationalState = 'AVAILABLE' | 'ENABLED' | 'DISABLED' | 'MISCONFIGURED' | 'FAILED' | 'UNAVAILABLE';

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  runtimeImplemented: boolean;
  permission: 'MANAGE_SETTINGS' | 'MANAGE_TICKETS' | 'MODERATE_MEMBER' | 'MANAGE_ANNOUNCEMENTS';
}

export const MODULE_CATALOG: readonly ModuleDefinition[] = [
  { key: 'tickets', label: 'Support Tickets', description: 'Support ticket lifecycle and transcripts', runtimeImplemented: true, permission: 'MANAGE_TICKETS' },
  { key: 'moderation', label: 'Moderation', description: 'Guild moderation actions', runtimeImplemented: true, permission: 'MODERATE_MEMBER' },
  { key: 'welcome', label: 'Welcome', description: 'Member onboarding and welcome messages', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'tasks', label: 'Tasks', description: 'Guild task records', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'reminders', label: 'Reminders', description: 'Guild reminders', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'meetings', label: 'Meetings', description: 'Guild meetings', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'embeds', label: 'Embeds', description: 'Message and embed tools', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'automation', label: 'Automation', description: 'Guild-configured member event automations with durable execution', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'analytics', label: 'Analytics', description: 'Analytics views', runtimeImplemented: false, permission: 'MANAGE_SETTINGS' },
  { key: 'logging', label: 'Logging', description: 'Guild audit logging', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'announcements', label: 'Announcements', description: 'Guild announcements', runtimeImplemented: true, permission: 'MANAGE_ANNOUNCEMENTS' },
  { key: 'roles', label: 'Roles', description: 'Guild role management', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'messaging', label: 'Message Center', description: 'Dashboard message tools', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'members', label: 'Members', description: 'Guild member directory', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'social', label: 'Social', description: 'Community polls and guild-scoped suggestions with Discord submissions and staff review', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'entertainment', label: 'Entertainment', description: 'Entertainment records; no bot runtime consumer is present', runtimeImplemented: false, permission: 'MANAGE_SETTINGS' },
  { key: 'utilities', label: 'Utilities', description: 'Utility tools', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'customCommands', label: 'Custom Commands', description: 'Guild-configured safe response commands', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
  { key: 'kraxx-ai', label: 'Kraxx AI', description: 'Explicit-request AI answers in configured channels', runtimeImplemented: true, permission: 'MANAGE_SETTINGS' },
];

const moduleMap = new Map(MODULE_CATALOG.map((definition) => [definition.key, definition]));

export function getModuleDefinition(key: string): ModuleDefinition | undefined {
  return moduleMap.get(key as ModuleKey);
}

export function assertModuleKey(key: string): asserts key is ModuleKey {
  if (!getModuleDefinition(key)) throw new Error('Unknown module key.');
}

export function getModuleState(key: string, enabled: boolean | undefined): ModuleOperationalState {
  const definition = getModuleDefinition(key);
  if (!definition) return 'UNAVAILABLE';
  if (enabled !== true) return enabled === false ? 'DISABLED' : 'AVAILABLE';
  return definition.runtimeImplemented ? 'ENABLED' : 'UNAVAILABLE';
}
