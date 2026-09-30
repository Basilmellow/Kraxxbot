import { z } from 'zod';

const snowflake = z.string().regex(/^\d{17,20}$/);
export const kraxxAiSettingsSchema = z.object({
  allowedChannels: z.array(snowflake).max(100).default([]),
  userCooldownSeconds: z.number().int().min(5).max(300).default(10),
  guildRequestsPerMinute: z.number().int().min(1).max(60).default(10),
  maxInputLength: z.number().int().min(20).max(2000).default(1200),
  maxOutputLength: z.number().int().min(100).max(1800).default(1200),
  responseStyle: z.enum(['BALANCED', 'CASUAL', 'PROFESSIONAL', 'TECHNICAL']).default('BALANCED'),
}).strict();

export type KraxxAiSettings = z.infer<typeof kraxxAiSettingsSchema>;

export function parseKraxxAiSettings(value: string | null | undefined): KraxxAiSettings {
  const raw: unknown = value ? JSON.parse(value) : {};
  return kraxxAiSettingsSchema.parse(raw);
}

export function normalizeAiOutput(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') throw new Error('AI_EMPTY_RESPONSE');
  const text = value.trim().replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@([!&]?\d+)>/g, '<@​$1>');
  if (!text) throw new Error('AI_EMPTY_RESPONSE');
  if (text.length <= maxLength) return text;
  const safeLimit = Math.max(1, maxLength - 1);
  let prefix = text.slice(0, safeLimit);
  if (prefix.charCodeAt(prefix.length - 1) >= 0xd800 && prefix.charCodeAt(prefix.length - 1) <= 0xdbff) prefix = prefix.slice(0, -1);
  const boundary = prefix.lastIndexOf(' ');
  return `${(boundary > safeLimit * 0.65 ? prefix.slice(0, boundary) : prefix).trimEnd()}…`;
}
