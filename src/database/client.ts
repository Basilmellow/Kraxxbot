import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Bind log events to Pino logger
prisma.$on('error' as never, (e: { message: string }) => {
  logger.error({ err: e }, 'Prisma Database Error');
});

prisma.$on('warn' as never, (e: { message: string }) => {
  logger.warn({ warn: e }, 'Prisma Database Warning');
});

/**
 * Connects to the database and tests connection health.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully via Prisma');
  } catch (error) {
    logger.error({ err: error }, '❌ Database Connection Failed');
    throw error;
  }
}
