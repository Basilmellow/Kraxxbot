"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kraxxAiSettingsSchema = void 0;
exports.parseKraxxAiSettings = parseKraxxAiSettings;
exports.normalizeAiOutput = normalizeAiOutput;
const zod_1 = require("zod");
const snowflake = zod_1.z.string().regex(/^\d{17,20}$/);
exports.kraxxAiSettingsSchema = zod_1.z.object({
    allowedChannels: zod_1.z.array(snowflake).max(100).default([]),
    userCooldownSeconds: zod_1.z.number().int().min(5).max(300).default(10),
    guildRequestsPerMinute: zod_1.z.number().int().min(1).max(60).default(10),
    maxInputLength: zod_1.z.number().int().min(20).max(2000).default(1200),
    maxOutputLength: zod_1.z.number().int().min(100).max(1800).default(1200),
    responseStyle: zod_1.z.enum(['BALANCED', 'CASUAL', 'PROFESSIONAL', 'TECHNICAL']).default('BALANCED'),
}).strict();
function parseKraxxAiSettings(value) {
    const raw = value ? JSON.parse(value) : {};
    return exports.kraxxAiSettingsSchema.parse(raw);
}
function normalizeAiOutput(value, maxLength) {
    if (typeof value !== 'string')
        throw new Error('AI_EMPTY_RESPONSE');
    const text = value.trim().replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@([!&]?\d+)>/g, '<@​$1>');
    if (!text)
        throw new Error('AI_EMPTY_RESPONSE');
    if (text.length <= maxLength)
        return text;
    const safeLimit = Math.max(1, maxLength - 1);
    let prefix = text.slice(0, safeLimit);
    if (prefix.charCodeAt(prefix.length - 1) >= 0xd800 && prefix.charCodeAt(prefix.length - 1) <= 0xdbff)
        prefix = prefix.slice(0, -1);
    const boundary = prefix.lastIndexOf(' ');
    return `${(boundary > safeLimit * 0.65 ? prefix.slice(0, boundary) : prefix).trimEnd()}…`;
}
