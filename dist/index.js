"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const environment_1 = require("./config/environment");
const logger_1 = require("./utils/logger");
const client_1 = require("./database/client");
const ready_1 = require("./events/ready");
const interactionCreate_1 = require("./events/interactionCreate");
const guildMemberAdd_1 = require("./events/guildMemberAdd");
const guildMemberRemove_1 = require("./events/guildMemberRemove");
const guildCreate_1 = require("./events/guildCreate");
const guildDelete_1 = require("./events/guildDelete");
// Command imports
const role_1 = __importDefault(require("./commands/admin/role"));
const moderate_1 = __importDefault(require("./commands/admin/moderate"));
const config_1 = __importDefault(require("./commands/admin/config"));
const setup_1 = __importDefault(require("./commands/admin/setup"));
const announce_1 = __importDefault(require("./commands/announcements/announce"));
const event_1 = __importDefault(require("./commands/events/event"));
const task_1 = __importDefault(require("./commands/tasks/task"));
const remind_1 = __importDefault(require("./commands/reminders/remind"));
const meeting_1 = __importDefault(require("./commands/meetings/meeting"));
const project_1 = __importDefault(require("./commands/projects/project"));
const client_2 = __importDefault(require("./commands/clients/client"));
const template_1 = __importDefault(require("./commands/templates/template"));
const ping_1 = __importDefault(require("./commands/general/ping"));
const info_1 = __importDefault(require("./commands/general/info"));
const verify_1 = __importDefault(require("./commands/general/verify"));
const say_1 = __importDefault(require("./commands/utility/say"));
const sayembed_1 = __importDefault(require("./commands/utility/sayembed"));
const sayedit_1 = __importDefault(require("./commands/utility/sayedit"));
const sayreply_1 = __importDefault(require("./commands/utility/sayreply"));
const saykeep_1 = __importDefault(require("./commands/utility/saykeep"));
const selfrole_1 = __importDefault(require("./commands/roles/selfrole"));
const ticket_1 = __importDefault(require("./commands/tickets/ticket"));
const custom_1 = __importDefault(require("./commands/utility/custom"));
const ask_1 = __importDefault(require("./commands/utility/ask"));
const messageCreate_1 = require("./events/messageCreate");
async function bootstrap() {
    logger_1.logger.info('Initializing KRAXX Discord Operations Bot...');
    // 1. Initialize Database Connection
    await (0, client_1.initializeDatabase)();
    // 2. Instantiate Discord Client
    const client = new discord_js_1.Client({
        intents: [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMembers,
            discord_js_1.GatewayIntentBits.GuildMessages,
        ],
    });
    // 3. Register Commands Collection
    const commandMap = new discord_js_1.Collection();
    const commandsList = [
        moderate_1.default,
        role_1.default,
        config_1.default,
        setup_1.default,
        announce_1.default,
        event_1.default,
        task_1.default,
        remind_1.default,
        meeting_1.default,
        project_1.default,
        client_2.default,
        template_1.default,
        ping_1.default,
        info_1.default,
        verify_1.default,
        say_1.default,
        sayembed_1.default,
        sayedit_1.default,
        sayreply_1.default,
        saykeep_1.default,
        selfrole_1.default,
        ticket_1.default,
        custom_1.default,
        ask_1.default,
    ];
    for (const cmd of commandsList) {
        commandMap.set(cmd.data.name, cmd);
    }
    // 4. Bind Event Handlers
    client.once('ready', () => (0, ready_1.onReady)(client));
    client.on('interactionCreate', interaction => (0, interactionCreate_1.onInteractionCreate)(interaction, commandMap));
    client.on('messageCreate', message => (0, messageCreate_1.onMessageCreate)(message));
    client.on('guildMemberAdd', member => (0, guildMemberAdd_1.onGuildMemberAdd)(member));
    client.on('guildMemberRemove', member => (0, guildMemberRemove_1.onGuildMemberRemove)(member));
    client.on('guildCreate', guild => (0, guildCreate_1.onGuildCreate)(guild));
    client.on('guildAvailable', guild => (0, guildCreate_1.onGuildAvailable)(guild));
    client.on('guildDelete', guild => (0, guildDelete_1.onGuildDelete)(guild));
    // 5. Connect Gateway
    if (environment_1.env.DISCORD_TOKEN === 'your_discord_bot_token_here' || !environment_1.env.DISCORD_TOKEN) {
        logger_1.logger.warn('⚠️ DISCORD_TOKEN is currently set to placeholder value in .env. Bot gateway connection skipped.');
        logger_1.logger.info('Set real DISCORD_TOKEN in .env file to complete live connection.');
        return;
    }
    await client.login(environment_1.env.DISCORD_TOKEN).catch(error => {
        logger_1.logger.error({ err: error }, '❌ Discord Client Login Failed');
    });
}
bootstrap().catch(err => {
    logger_1.logger.fatal({ err }, 'Fatal bootstrap failure');
    process.exit(1);
});
