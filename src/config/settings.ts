import { z } from 'zod';

const snowflake = z.union([
  z.string().regex(/^\d{17,20}$/),
  z.literal(''),
  z.null(),
]).transform((value) => value || null);

/** Shared, tenant-neutral input contract used by dashboard and bot callers. */
export const settingsContract = z.object({
  prefix: z.string().trim().min(1).max(5).optional(),
  locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
  timezone: z.string().max(80).refine((value) => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; }
    catch { return false; }
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

export type SettingsInput = z.infer<typeof settingsContract>;
