import { env } from './environment';

export interface ChannelMapping {
  key: string;
  name: string;
  id: string;
  category: string;
}

export const CHANNEL_CONFIGS: Record<string, ChannelMapping> = {
  WELCOME: { key: 'WELCOME', name: '#welcome', id: env.WELCOME_CHANNEL_ID, category: 'Onboarding' },
  VERIFY: { key: 'VERIFY', name: '#verify', id: env.VERIFY_CHANNEL_ID, category: 'Onboarding' },
  ANNOUNCEMENTS: { key: 'ANNOUNCEMENTS', name: '#announcements', id: env.ANNOUNCEMENTS_CHANNEL_ID, category: 'General' },
  EVENTS: { key: 'EVENTS', name: '#events', id: env.EVENTS_CHANNEL_ID, category: 'General' },
  KRAXX_GENERAL: { key: 'KRAXX_GENERAL', name: '#kraxx-general', id: env.KRAXX_GENERAL_CHANNEL_ID, category: 'General' },
  KRAXX_SUPPORT: { key: 'KRAXX_SUPPORT', name: '#kraxx-support', id: env.KRAXX_SUPPORT_CHANNEL_ID, category: 'General' },

  SEC_ANNOUNCEMENTS: { key: 'SEC_ANNOUNCEMENTS', name: '#sec-announcements', id: env.SEC_ANNOUNCEMENTS_CHANNEL_ID, category: 'KRAXXSEC' },
  SEC_GENERAL: { key: 'SEC_GENERAL', name: '#sec-general', id: env.SEC_GENERAL_CHANNEL_ID, category: 'KRAXXSEC' },
  SEC_PROJECTS: { key: 'SEC_PROJECTS', name: '#sec-projects', id: env.SEC_PROJECTS_CHANNEL_ID, category: 'KRAXXSEC' },
  SEC_RESEARCH: { key: 'SEC_RESEARCH', name: '#sec-research', id: env.SEC_RESEARCH_CHANNEL_ID, category: 'KRAXXSEC' },

  STUDIO_ANNOUNCEMENTS: { key: 'STUDIO_ANNOUNCEMENTS', name: '#studio-announcements', id: env.STUDIO_ANNOUNCEMENTS_CHANNEL_ID, category: 'KRAXX STUDIO' },
  STUDIO_GENERAL: { key: 'STUDIO_GENERAL', name: '#studio-general', id: env.STUDIO_GENERAL_CHANNEL_ID, category: 'KRAXX STUDIO' },
  STUDIO_PROJECTS: { key: 'STUDIO_PROJECTS', name: '#studio-projects', id: env.STUDIO_PROJECTS_CHANNEL_ID, category: 'KRAXX STUDIO' },
  STUDIO_WORK: { key: 'STUDIO_WORK', name: '#studio-work', id: env.STUDIO_WORK_CHANNEL_ID, category: 'KRAXX STUDIO' },

  HQ_DASHBOARD: { key: 'HQ_DASHBOARD', name: '#hq-dashboard', id: env.HQ_DASHBOARD_CHANNEL_ID, category: 'Operations' },
  TASKS: { key: 'TASKS', name: '#tasks', id: env.TASKS_CHANNEL_ID, category: 'Operations' },
  MEETINGS: { key: 'MEETINGS', name: '#meetings', id: env.MEETINGS_CHANNEL_ID, category: 'Operations' },
  REMINDERS: { key: 'REMINDERS', name: '#reminders', id: env.REMINDERS_CHANNEL_ID, category: 'Operations' },
  PENDING: { key: 'PENDING', name: '#pending', id: env.PENDING_CHANNEL_ID, category: 'Operations' },
  APPROVALS: { key: 'APPROVALS', name: '#approvals', id: env.APPROVALS_CHANNEL_ID, category: 'Operations' },

  CLIENTS_GENERAL: { key: 'CLIENTS_GENERAL', name: '#clients-general', id: env.CLIENTS_GENERAL_CHANNEL_ID, category: 'Clients' },

  MANAGEMENT_ZONE: { key: 'MANAGEMENT_ZONE', name: '#management-zone', id: env.MANAGEMENT_ZONE_CHANNEL_ID, category: 'Admin' },
  MODERATOR_ONLY: { key: 'MODERATOR_ONLY', name: '#moderator-only', id: env.MODERATOR_ONLY_CHANNEL_ID, category: 'Admin' },
  SAFETY_UPDATES: { key: 'SAFETY_UPDATES', name: '#safety-updates', id: env.SAFETY_UPDATES_CHANNEL_ID, category: 'Admin' },
  BOT_LOG: { key: 'BOT_LOG', name: '#bot-logs', id: env.BOT_LOG_CHANNEL_ID, category: 'Admin' },
};

/**
 * Diagnostic helper to print channel mapping readiness.
 */
export function getChannelDiagnostics(): Array<{ key: string; name: string; configured: boolean; id: string }> {
  return Object.values(CHANNEL_CONFIGS).map(ch => ({
    key: ch.key,
    name: ch.name,
    configured: Boolean(ch.id && ch.id.trim().length > 0),
    id: ch.id || 'NOT_SET',
  }));
}
