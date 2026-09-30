import { Message } from 'discord.js';
import { createKraxxAiDelivery } from '../services/kraxx-ai-discord';
import { executeKraxxAi, KraxxAiError } from '../services/kraxx-ai.service';
import { logger } from '../utils/logger';

export async function onMessageCreate(message: Message): Promise<void> {
  const botId = message.client.user?.id;
  if (!botId || !message.guild || !message.guildId || message.author.bot || message.webhookId || !message.mentions.users.has(botId)) return;
  const prompt = message.content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
  try {
    await executeKraxxAi({ guildId: message.guildId, userId: message.author.id, channelId: message.channelId,
      requestId: message.id, prompt, verifyMembership: async () => Boolean(await message.guild!.members.fetch(message.author.id)),
      verifyChannel: async () => { const channel = await message.guild!.channels.fetch(message.channelId); return Boolean(channel && channel.guildId === message.guildId && channel.isTextBased() && 'send' in channel); } },
    createKraxxAiDelivery(message.guild));
  } catch (error) {
    // Disabled, unavailable, disallowed-channel, cooldown, and malformed requests are intentionally silent for mentions.
    if (error instanceof KraxxAiError) return;
    logger.warn({ guildId: message.guildId, userId: message.author.id, requestId: message.id, code: error instanceof Error ? error.name : 'UNKNOWN' }, 'Kraxx AI mention rejected');
  }
}
