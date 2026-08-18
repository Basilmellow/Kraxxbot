import { REST, Routes } from 'discord.js';
import { env } from '../src/config/environment';
import { logger } from '../src/utils/logger';

// Import all command definitions
import roleCommand from '../src/commands/admin/role';
import configCommand from '../src/commands/admin/config';
import setupCommand from '../src/commands/admin/setup';
import announceCommand from '../src/commands/announcements/announce';
import eventCommand from '../src/commands/events/event';
import taskCommand from '../src/commands/tasks/task';
import remindCommand from '../src/commands/reminders/remind';
import meetingCommand from '../src/commands/meetings/meeting';
import projectCommand from '../src/commands/projects/project';
import clientCommand from '../src/commands/clients/client';
import templateCommand from '../src/commands/templates/template';
import pingCommand from '../src/commands/general/ping';
import infoCommand from '../src/commands/general/info';
import verifyCommand from '../src/commands/general/verify';
import sayCommand from '../src/commands/utility/say';
import sayEmbedCommand from '../src/commands/utility/sayembed';
import sayEditCommand from '../src/commands/utility/sayedit';
import sayReplyCommand from '../src/commands/utility/sayreply';
import sayKeepCommand from '../src/commands/utility/saykeep';
import selfRoleCommand from '../src/commands/roles/selfrole';
import ticketCommand from '../src/commands/tickets/ticket';

const commands = [
  roleCommand.data.toJSON(),
  configCommand.data.toJSON(),
  setupCommand.data.toJSON(),
  announceCommand.data.toJSON(),
  eventCommand.data.toJSON(),
  taskCommand.data.toJSON(),
  remindCommand.data.toJSON(),
  meetingCommand.data.toJSON(),
  projectCommand.data.toJSON(),
  clientCommand.data.toJSON(),
  templateCommand.data.toJSON(),
  pingCommand.data.toJSON(),
  infoCommand.data.toJSON(),
  verifyCommand.data.toJSON(),
  sayCommand.data.toJSON(),
  sayEmbedCommand.data.toJSON(),
  sayEditCommand.data.toJSON(),
  sayReplyCommand.data.toJSON(),
  sayKeepCommand.data.toJSON(),
  selfRoleCommand.data.toJSON(),
  ticketCommand.data.toJSON(),
];

async function deployCommands() {
  logger.info(`Starting deployment of ${commands.length} application (/) commands...`);

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  try {
    if (env.DISCORD_GUILD_ID && env.DISCORD_GUILD_ID !== 'your_discord_guild_id_here') {
      logger.info(`Deploying commands to Target Guild ID: ${env.DISCORD_GUILD_ID}`);
      await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
        { body: commands }
      );
      logger.info('✅ Successfully registered guild application commands.');
    } else {
      logger.info('Deploying commands globally...');
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
      logger.info('✅ Successfully registered global application commands.');
    }
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to deploy application commands');
    process.exit(1);
  }
}

deployCommands();
