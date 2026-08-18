import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const environmentSchema = z.object({
  // Discord Application Credentials
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().min(1, 'DISCORD_GUILD_ID is required'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // System & Environment
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Role IDs
  FOUNDER_ROLE_ID: z.string().optional().default(''),
  COFOUNDER_ROLE_ID: z.string().optional().default(''),
  MANAGEMENT_ROLE_ID: z.string().optional().default(''),
  TEAM_LEAD_ROLE_ID: z.string().optional().default(''),
  PARTNER_ROLE_ID: z.string().optional().default(''),
  KRAXXSEC_ROLE_ID: z.string().optional().default(''),
  KRAXXSTUDIO_ROLE_ID: z.string().optional().default(''),
  CLIENT_ROLE_ID: z.string().optional().default(''),
  USER_ROLE_ID: z.string().optional().default(''),
  KRAXX_BOT_ROLE_ID: z.string().optional().default(''),

  // Channel IDs
  WELCOME_CHANNEL_ID: z.string().optional().default(''),
  VERIFY_CHANNEL_ID: z.string().optional().default(''),
  ANNOUNCEMENTS_CHANNEL_ID: z.string().optional().default(''),
  EVENTS_CHANNEL_ID: z.string().optional().default(''),
  KRAXX_GENERAL_CHANNEL_ID: z.string().optional().default(''),
  KRAXX_SUPPORT_CHANNEL_ID: z.string().optional().default(''),

  SEC_ANNOUNCEMENTS_CHANNEL_ID: z.string().optional().default(''),
  SEC_GENERAL_CHANNEL_ID: z.string().optional().default(''),
  SEC_PROJECTS_CHANNEL_ID: z.string().optional().default(''),
  SEC_RESEARCH_CHANNEL_ID: z.string().optional().default(''),

  STUDIO_ANNOUNCEMENTS_CHANNEL_ID: z.string().optional().default(''),
  STUDIO_GENERAL_CHANNEL_ID: z.string().optional().default(''),
  STUDIO_PROJECTS_CHANNEL_ID: z.string().optional().default(''),
  STUDIO_WORK_CHANNEL_ID: z.string().optional().default(''),

  HQ_DASHBOARD_CHANNEL_ID: z.string().optional().default(''),
  TASKS_CHANNEL_ID: z.string().optional().default(''),
  MEETINGS_CHANNEL_ID: z.string().optional().default(''),
  REMINDERS_CHANNEL_ID: z.string().optional().default(''),
  PENDING_CHANNEL_ID: z.string().optional().default(''),
  APPROVALS_CHANNEL_ID: z.string().optional().default(''),

  CLIENTS_GENERAL_CHANNEL_ID: z.string().optional().default(''),

  MANAGEMENT_ZONE_CHANNEL_ID: z.string().optional().default(''),
  MODERATOR_ONLY_CHANNEL_ID: z.string().optional().default(''),
  SAFETY_UPDATES_CHANNEL_ID: z.string().optional().default(''),

  BOT_LOG_CHANNEL_ID: z.string().optional().default(''),
});

export type Environment = z.infer<typeof environmentSchema>;

/**
 * Validates and parses application environment variables.
 * Exits process cleanly if required variables are missing or invalid.
 */
export function validateEnvironment(): Environment {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ CRITICAL: Environment Variable Validation Failed');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnvironment();
