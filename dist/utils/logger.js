"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const environment_1 = require("../config/environment");
exports.logger = (0, pino_1.default)({
    level: environment_1.env.LOG_LEVEL,
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
    transport: environment_1.env.NODE_ENV === 'development'
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
