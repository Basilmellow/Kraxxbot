"use strict";
/**
 * Channel configuration helpers.
 *
 * NOTE: In the multi-tenant KRAXXBot architecture, channel IDs are configured
 * per-guild in the database (GuildSettings model), NOT via environment variables.
 * This file now provides type definitions and diagnostic utilities only.
 * Channel IDs should be resolved from GuildSettings at runtime.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHANNEL_KEYS = void 0;
exports.getChannelDiagnostics = getChannelDiagnostics;
/**
 * Known channel keys used throughout KRAXXBot.
 * Actual IDs come from GuildSettings (DB), not env vars.
 */
exports.CHANNEL_KEYS = {
    WELCOME: 'WELCOME',
    VERIFY: 'VERIFY',
    ANNOUNCEMENTS: 'ANNOUNCEMENTS',
    EVENTS: 'EVENTS',
    GENERAL: 'GENERAL',
    SUPPORT: 'SUPPORT',
    AUDIT_LOG: 'AUDIT_LOG',
    TICKET_LOG: 'TICKET_LOG',
};
/**
 * Diagnostic helper — returns a list of channel keys with placeholder info.
 * Actual configured IDs must be resolved from GuildSettings at runtime.
 */
function getChannelDiagnostics() {
    return Object.values(exports.CHANNEL_KEYS).map((key) => ({
        key,
        name: `#${key.toLowerCase().replace(/_/g, '-')}`,
        configured: false,
        id: 'Resolve from GuildSettings',
    }));
}
