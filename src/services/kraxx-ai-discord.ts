import { Guild, PermissionFlagsBits } from 'discord.js';
import { MessageOperationService, type MessageOperationAdapter, type MessageOperationInput } from './message-operation.service';
import type { KraxxAiDelivery } from './kraxx-ai.service';

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
      idempotencyKey: input.requestId, channelId: input.channelId, content: input.content, mentionMode: 'NONE' }, adapter);
    return result.status === 'PENDING' ? 'UNKNOWN' : result.status;
  };
}
