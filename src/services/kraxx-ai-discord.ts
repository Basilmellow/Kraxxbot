import { Guild, PermissionFlagsBits } from 'discord.js';
import { MessageOperationService, type MessageOperationAdapter, type MessageOperationInput } from './message-operation.service';
import type { KraxxAiDelivery } from './kraxx-ai.service';

const DISCORD_MESSAGE_LIMIT = 2000;
const QUESTION_DISPLAY_LIMIT = 1024;

function truncateForDiscord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  if (maxLength <= 0) return '';
  if (maxLength === 1) return '…';

  const safeLimit = maxLength - 1;
  let prefix = value.slice(0, safeLimit);
  const lastCode = prefix.charCodeAt(prefix.length - 1);
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) prefix = prefix.slice(0, -1);
  const boundary = prefix.lastIndexOf(' ');
  if (boundary > safeLimit * 0.65) prefix = prefix.slice(0, boundary);
  return `${prefix.trimEnd()}…`;
}

export function formatKraxxAiResponse(input: { userId: string; prompt: string; answer: string }): string {
  const header = `**Kraxx AI**\n**Asked by** <@${input.userId}>\n\n**Question**\n`;
  const answerHeader = '\n\n**Answer**\n';
  const available = Math.max(0, DISCORD_MESSAGE_LIMIT - header.length - answerHeader.length);
  const question = truncateForDiscord(input.prompt.trim(), Math.min(QUESTION_DISPLAY_LIMIT, available - 1));
  const answer = truncateForDiscord(input.answer.trim(), available - question.length);
  return `${header}${question}${answerHeader}${answer}`;
}

export function createKraxxAiDelivery(guild: Guild): KraxxAiDelivery {
  const adapter: MessageOperationAdapter = {
    async authorize(operation: MessageOperationInput) {
      if (operation.guildId !== guild.id || operation.source !== 'BOT' || operation.operationType !== 'SEND') throw new Error('AI_GUILD_MISMATCH');
      await guild.members.fetch(operation.actorId);
      const channel = await guild.channels.fetch(operation.channelId);
      if (!channel || channel.guildId !== guild.id || !channel.isTextBased() || !('send' in channel)) throw new Error('AI_CHANNEL_INVALID');
      const botMember = guild.members.me || await guild.members.fetchMe();
      const permission = channel.permissionsFor(botMember);
      if (!permission?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw new Error('AI_BOT_PERMISSION_DENIED');
    },
    async send(args) {
      const channel = await guild.channels.fetch(args.channelId) as any;
      const message = await channel.send({ content: args.content, allowedMentions: { parse: [] }, nonce: args.nonce, enforceNonce: true });
      return { messageId: message.id };
    },
    async edit() { throw new Error('AI_EDIT_UNSUPPORTED'); },
    async delete() { throw new Error('AI_DELETE_UNSUPPORTED'); },
  };

  return async input => {
    const result = await MessageOperationService.execute({ guildId: input.guildId, actorId: input.userId, source: 'BOT', operationType: 'SEND',
      idempotencyKey: input.requestId, channelId: input.channelId,
      content: formatKraxxAiResponse({ userId: input.userId, prompt: input.prompt, answer: input.content }), mentionMode: 'NONE' }, adapter);
    return result.status === 'PENDING' ? 'UNKNOWN' : result.status;
  };
}
