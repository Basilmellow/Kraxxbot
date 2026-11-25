"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.initializeDatabase = initializeDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
exports.prisma = new client_1.PrismaClient({
    log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
    ],
});
// Bind log events to Pino logger
exports.prisma.$on('error', (e) => {
    logger_1.logger.error({ err: e }, 'Prisma Database Error');
});
exports.prisma.$on('warn', (e) => {
    logger_1.logger.warn({ warn: e }, 'Prisma Database Warning');
});
/**
 * Connects to the database and tests connection health.
 */
async function initializeDatabase() {
    try {
        await exports.prisma.$connect();
        logger_1.logger.info('✅ Database connected successfully via Prisma');
    }
    catch (error) {
        logger_1.logger.error({ err: error }, '❌ Database Connection Failed');
        throw error;
    }
}
