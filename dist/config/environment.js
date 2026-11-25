"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.validateEnvironment = validateEnvironment;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
// Load environment variables from .env file
dotenv_1.default.config();
const environmentSchema = zod_1.z.object({
    // Discord Application Credentials (Global Application ID: 1539277990855311370)
    DISCORD_TOKEN: zod_1.z.string().min(1, 'DISCORD_TOKEN is required'),
    DISCORD_CLIENT_ID: zod_1.z.string().min(1, 'DISCORD_CLIENT_ID is required'),
    DISCORD_CLIENT_SECRET: zod_1.z.string().optional().default(''),
    DISCORD_GUILD_ID: zod_1.z.string().optional().default(''), // Optional — dev instant registration flag only
    // Database Connection
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    // System & Environment
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
});
/**
 * Validates and parses application environment variables.
 * Exits process cleanly if required variables are missing or invalid.
 */
function validateEnvironment() {
    const result = environmentSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ CRITICAL: Environment Variable Validation Failed');
        console.error(JSON.stringify(result.error.format(), null, 2));
        process.exit(1);
    }
    return result.data;
}
exports.env = validateEnvironment();
