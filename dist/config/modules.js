"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_CATALOG = void 0;
exports.getModuleDefinition = getModuleDefinition;
exports.assertModuleKey = assertModuleKey;
exports.getModuleState = getModuleState;
exports.MODULE_CATALOG = [
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
const moduleMap = new Map(exports.MODULE_CATALOG.map((definition) => [definition.key, definition]));
function getModuleDefinition(key) {
    return moduleMap.get(key);
}
function assertModuleKey(key) {
    if (!getModuleDefinition(key))
        throw new Error('Unknown module key.');
}
function getModuleState(key, enabled) {
    const definition = getModuleDefinition(key);
    if (!definition)
        return 'UNAVAILABLE';
    if (enabled !== true)
        return enabled === false ? 'DISABLED' : 'AVAILABLE';
    return definition.runtimeImplemented ? 'ENABLED' : 'UNAVAILABLE';
}
