/**
 * Channel configuration helpers.
 *
 * NOTE: In the multi-tenant KRAXXBot architecture, channel IDs are configured
 * per-guild in the database (GuildSettings model), NOT via environment variables.
 * This file now provides type definitions and diagnostic utilities only.
 * Channel IDs should be resolved from GuildSettings at runtime.
 */

export interface ChannelMapping {
  key: string;
  name: string;
  id: string;
  category: string;
}

/**
 * Known channel keys used throughout KRAXXBot.
 * Actual IDs come from GuildSettings (DB), not env vars.
 */
export const CHANNEL_KEYS = {
  WELCOME: 'WELCOME',
  VERIFY: 'VERIFY',
  ANNOUNCEMENTS: 'ANNOUNCEMENTS',
  EVENTS: 'EVENTS',
  GENERAL: 'GENERAL',
  SUPPORT: 'SUPPORT',
  AUDIT_LOG: 'AUDIT_LOG',
  TICKET_LOG: 'TICKET_LOG',
} as const;

export type ChannelKey = keyof typeof CHANNEL_KEYS;

/**
 * Diagnostic helper — returns a list of channel keys with placeholder info.
 * Actual configured IDs must be resolved from GuildSettings at runtime.
 */
export function getChannelDiagnostics(): Array<{ key: string; name: string; configured: boolean; id: string }> {
  return Object.values(CHANNEL_KEYS).map((key) => ({
    key,
    name: `#${key.toLowerCase().replace(/_/g, '-')}`,
    configured: false,
    id: 'Resolve from GuildSettings',
  }));
}
