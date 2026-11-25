"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTOMATION_ACTIONS = exports.AUTOMATION_TRIGGERS = void 0;
exports.validateAutomationConfig = validateAutomationConfig;
exports.AUTOMATION_TRIGGERS = ['MEMBER_JOIN', 'MEMBER_LEAVE'];
exports.AUTOMATION_ACTIONS = ['SEND_MESSAGE', 'SEND_DM'];
function validateAutomationConfig(trigger, action, rawConfig) {
    if (!exports.AUTOMATION_TRIGGERS.includes(trigger))
        throw new Error('UnsupportedAutomationTrigger');
    if (!exports.AUTOMATION_ACTIONS.includes(action))
        throw new Error('UnsupportedAutomationAction');
    let config = rawConfig;
    if (typeof config === 'string') {
        try {
            config = JSON.parse(config);
        }
        catch {
            throw new Error('InvalidAutomationConfig');
        }
    }
    if (!config || typeof config !== 'object' || Array.isArray(config))
        throw new Error('InvalidAutomationConfig');
    const input = config;
    if (Object.keys(input).some((key) => !['channelId', 'message'].includes(key)))
        throw new Error('UnexpectedAutomationConfigField');
    if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > 2000)
        throw new Error('InvalidAutomationMessage');
    if (action === 'SEND_MESSAGE') {
        if (typeof input.channelId !== 'string' || !/^\d{17,20}$/.test(input.channelId))
            throw new Error('InvalidAutomationChannel');
        return { channelId: input.channelId, message: input.message.trim() };
    }
    if (input.channelId !== undefined)
        throw new Error('UnexpectedAutomationChannel');
    return { message: input.message.trim() };
}
