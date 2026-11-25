"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsContract = void 0;
const zod_1 = require("zod");
const snowflake = zod_1.z.union([
    zod_1.z.string().regex(/^\d{17,20}$/),
    zod_1.z.literal(''),
    zod_1.z.null(),
]).transform((value) => value || null);
/** Shared, tenant-neutral input contract used by dashboard and bot callers. */
exports.settingsContract = zod_1.z.object({
    prefix: zod_1.z.string().trim().min(1).max(5).optional(),
    locale: zod_1.z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
    timezone: zod_1.z.string().max(80).refine((value) => {
        try {
            new Intl.DateTimeFormat('en', { timeZone: value });
            return true;
        }
        catch {
            return false;
        }
    }).optional(),
    adminRoleId: snowflake.optional(),
    modRoleId: snowflake.optional(),
    supportRoleId: snowflake.optional(),
    staffRoleId: snowflake.optional(),
    logChannelId: snowflake.optional(),
    modLogChannelId: snowflake.optional(),
    welcomeChannelId: snowflake.optional(),
    announcementChannelId: snowflake.optional(),
    ticketCategoryId: snowflake.optional(),
    ticketLogsChannelId: snowflake.optional(),
    ticketTranscriptsChannelId: snowflake.optional(),
}).strict();
