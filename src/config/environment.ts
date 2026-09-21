import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const environmentSchema = z.object({
  // Discord Application Credentials (Global Application ID: 1539277990855311370)
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().optional().default(''),
  DISCORD_GUILD_ID: z.string().optional().default(''), // Optional — dev instant registration flag only

  // Database Connection
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // System & Environment
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
