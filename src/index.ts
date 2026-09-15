import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { env } from './config/environment';
import { logger } from './utils/logger';
import { initializeDatabase } from './database/client';

import { onReady } from './events/ready';
import { onInteractionCreate } from './events/interactionCreate';
import { onGuildMemberAdd } from './events/guildMemberAdd';
import { onGuildMemberRemove } from './events/guildMemberRemove';
import { onGuildCreate } from './events/guildCreate';
import { onGuildDelete } from './events/guildDelete';

// Command imports
import roleCommand from './commands/admin/role';
import configCommand from './commands/admin/config';
import setupCommand from './commands/admin/setup';
import announceCommand from './commands/announcements/announce';
import eventCommand from './commands/events/event';
import taskCommand from './commands/tasks/task';
import remindCommand from './commands/reminders/remind';
import meetingCommand from './commands/meetings/meeting';
import projectCommand from './commands/projects/project';
import clientCommand from './commands/clients/client';
import templateCommand from './commands/templates/template';
import pingCommand from './commands/general/ping';
import infoCommand from './commands/general/info';
import verifyCommand from './commands/general/verify';
import sayCommand from './commands/utility/say';
import sayEmbedCommand from './commands/utility/sayembed';
import sayEditCommand from './commands/utility/sayedit';
import sayReplyCommand from './commands/utility/sayreply';
import sayKeepCommand from './commands/utility/saykeep';
import selfRoleCommand from './commands/roles/selfrole';
import ticketCommand from './commands/tickets/ticket';

async function bootstrap() {
  logger.info('Initializing KRAXX Discord Operations Bot...');

  // 1. Initialize Database Connection
  await initializeDatabase();

  // 2. Instantiate Discord Client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  // 3. Register Commands Collection
  const commandMap = new Collection<string, any>();
  const commandsList = [
    roleCommand,
    configCommand,
    setupCommand,
    announceCommand,
    eventCommand,
    taskCommand,
    remindCommand,
    meetingCommand,
    projectCommand,
    clientCommand,
    templateCommand,
    pingCommand,
    infoCommand,
    verifyCommand,
    sayCommand,
    sayEmbedCommand,
    sayEditCommand,
    sayReplyCommand,
    sayKeepCommand,
    selfRoleCommand,
    ticketCommand,
  ];

  for (const cmd of commandsList) {
    commandMap.set(cmd.data.name, cmd);
  }

  // 4. Bind Event Handlers
  client.once('ready', () => onReady(client));
  client.on('interactionCreate', interaction => onInteractionCreate(interaction, commandMap));
  client.on('guildMemberAdd', member => onGuildMemberAdd(member));
  client.on('guildMemberRemove', member => onGuildMemberRemove(member));
  client.on('guildCreate', guild => onGuildCreate(guild));
  client.on('guildDelete', guild => onGuildDelete(guild));

  // 5. Connect Gateway
  if (env.DISCORD_TOKEN === 'your_discord_bot_token_here' || !env.DISCORD_TOKEN) {
    logger.warn('⚠️ DISCORD_TOKEN is currently set to placeholder value in .env. Bot gateway connection skipped.');
    logger.info('Set real DISCORD_TOKEN in .env file to complete live connection.');
    return;
  }

  await client.login(env.DISCORD_TOKEN).catch(error => {
    logger.error({ err: error }, '❌ Discord Client Login Failed');
  });
}

bootstrap().catch(err => {
  logger.fatal({ err }, 'Fatal bootstrap failure');
  process.exit(1);
});
