import pino from 'pino';
import { env } from '../config/environment';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'DISCORD_TOKEN',
      'DATABASE_URL',
      '*.password',
      '*.secret',
      '*.token',
      'headers.authorization',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
