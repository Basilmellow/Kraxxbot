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

/**
 * Parses --guild <guildId> flag from CLI arguments.
 * Usage:
 *   npm run deploy:commands             → global registration (production)
 *   npm run deploy:commands:dev         → guild registration (instant, dev)
 *   npx ts-node scripts/deploy-commands.ts --guild 123456789
 */
function parseTargetGuildId(): string | null {
  const args = process.argv.slice(2);
  const guildFlagIndex = args.indexOf('--guild');
  if (guildFlagIndex !== -1 && args[guildFlagIndex + 1]) {
    return args[guildFlagIndex + 1];
  }

  // Fallback: Use DISCORD_GUILD_ID from env when running deploy:commands:dev
  const devMode = args.includes('--dev') || process.env.DEPLOY_MODE === 'dev';
  if (devMode && env.DISCORD_GUILD_ID && env.DISCORD_GUILD_ID !== 'your_discord_guild_id_here') {
    return env.DISCORD_GUILD_ID;
  }

  return null;
}

async function deployCommands() {
  logger.info(`Starting deployment of ${commands.length} application (/) commands...`);

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  const targetGuildId = parseTargetGuildId();

  try {
    if (targetGuildId) {
      // Guild registration — commands update instantly (ideal for development)
      logger.info(`🏠 Deploying to Guild ID: ${targetGuildId} (instant refresh — dev mode)`);
      await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, targetGuildId),
        { body: commands }
      );
      logger.info('✅ Guild-scoped application commands deployed successfully.');
    } else {
      // Global registration — propagates to ALL guilds where bot is installed (up to 1 hour)
      logger.info('🌐 Deploying globally across all guilds (production mode)...');
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
      logger.info('✅ Global application commands deployed successfully.');
      logger.info('⏳ Note: Global commands may take up to 1 hour to propagate to all Discord servers.');
    }
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to deploy application commands');
    process.exit(1);
  }
}

deployCommands();
