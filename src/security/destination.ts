import { Client, PermissionFlagsBits } from 'discord.js';
import { assertTenant, PolicyError } from './policy';

export async function workerDestination(client: Client, guildId: string, channelId: string) {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(channelId);
  assertTenant(guildId, channel?.guild.id);
  const bot = await guild.members.fetchMe();
  if (!channel || !channel.isTextBased() || channel.isThread()
    || !channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]))
    throw new PolicyError('Destination is unavailable to the bot.');
  return channel;
}
