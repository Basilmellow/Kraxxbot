import { MessageOperationError, MessageOperationService, type MessageOperationAdapter, type MessageOperationInput } from '../../../src/services/message-operation.service';
import { assertTenant, hasPermission, permission, PolicyError } from '../../../src/security/policy';
import { DiscordApiError } from '../../../src/services/discord-transport';
import { requireGuildCapability } from './capabilities';
import { validateChannel } from './destinations';
import { deleteChannelMessage, editChannelMessage, fetchBotRoleContext, fetchChannel, fetchChannelMessage, sendChannelMessage } from './discord';

function discordId(value: unknown): value is string { return typeof value === 'string' && /^\d{17,20}$/.test(value); }

export function executeDashboardMessageOperation(input: MessageOperationInput) {
  let actorPermissions = BigInt(0);
  const adapter: MessageOperationAdapter = {
    async authorize(operation) {
      const actor = await requireGuildCapability(operation.guildId, operation.actorId, 'MANAGE_ANNOUNCEMENTS');
      actorPermissions = actor.bits;
      const context = await fetchBotRoleContext(operation.guildId);
      const channel = await fetchChannel(operation.channelId);
      if (!channel) throw new PolicyError('Channel not found.');
      assertTenant(operation.guildId, channel.guild_id);
      const send = operation.operationType !== 'DELETE';
      await validateChannel(operation.guildId, operation.channelId, send, Boolean(operation.embeds?.length));
      if (![0, 5].includes(channel.type)) throw new PolicyError('Messages can only be managed in text or announcement channels.');
      if (operation.mentionMode === 'ROLE' && !context.roles.some(role => role.id === operation.mentionRoleId))
        throw new PolicyError('Mention role does not belong to this server.');
      if (operation.operationType === 'EDIT') {
        const message = await fetchChannelMessage(operation.channelId, operation.targetMessageId!);
        if (message.channel_id !== operation.channelId || !context.botMember.user || (message.author as { id?: string } | undefined)?.id !== context.botMember.user.id)
          throw new PolicyError('Only KRAXXBot messages in this channel can be edited.');
      }
    },
    async send(args) {
      const result = await sendChannelMessage(args.channelId, args.content, args.embeds, {
        allowedMentions: args.allowedMentions as { parse: string[]; roles?: string[]; users?: string[] }, nonce: args.nonce, components: args.components,
      });
      return { messageId: result.id };
    },
    async edit(args) {
      const result = await editChannelMessage(args.channelId, args.messageId, args.content, args.embeds,
        args.allowedMentions as { parse: string[]; roles?: string[]; users?: string[] }, args.components);
      return { messageId: result.id };
    },
    async delete(args) {
      let message: Awaited<ReturnType<typeof fetchChannelMessage>>;
      try {
        message = await fetchChannelMessage(args.channelId, args.messageId);
      } catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 404) {
          const channel = await fetchChannel(args.channelId);
          assertTenant(input.guildId, channel?.guild_id);
          if (!channel) throw new PolicyError('Channel no longer exists.');
          return { alreadyDeleted: true };
        }
        throw error;
      }
      if (message.channel_id !== args.channelId) throw new PolicyError('Message is not in this channel.');
      const context = await fetchBotRoleContext(input.guildId);
      const isBotMessage = (message.author as { id?: string } | undefined)?.id === context.botMember.user?.id;
      const botPermissions = context.roles.filter(role => role.id === input.guildId || context.botMember.roles.includes(role.id))
        .reduce((bits, role) => bits | BigInt(role.permissions), BigInt(0));
      if (!isBotMessage && (!hasPermission(botPermissions, permission(13)) || !hasPermission(actorPermissions, permission(13))))
        throw new PolicyError('Both the requesting member and bot need Manage Messages to delete another member’s message.');
      await deleteChannelMessage(args.channelId, args.messageId);
      return { alreadyDeleted: false };
    },
  };
  return MessageOperationService.execute(input, adapter);
}

export function normalizeDashboardMessageInput(value: Record<string, unknown>, actorId: string, key: string, operationType: 'SEND' | 'EDIT' | 'DELETE', targetMessageId?: string): MessageOperationInput {
  if (!discordId(value.guildId) || !discordId(value.channelId)) throw new Error('INVALID_MESSAGE_TENANT');
  if (value.mentionType !== undefined && !['NONE', 'EVERYONE', 'HERE', 'ROLE'].includes(String(value.mentionType)))
    throw new Error('INVALID_MENTION_MODE');
  const mentionMode = value.mentionType === 'EVERYONE' || value.mentionType === 'HERE' || value.mentionType === 'ROLE' ? value.mentionType : 'NONE';
  return {
    guildId: value.guildId, actorId, source: 'DASHBOARD', operationType, idempotencyKey: key,
    channelId: value.channelId, ...(targetMessageId ? { targetMessageId } : {}),
    ...(typeof value.content === 'string' ? { content: value.content.trim() } : {}),
    ...(Array.isArray(value.embeds) ? { embeds: value.embeds as object[] } : {}),
    mentionMode, ...(discordId(value.mentionRoleId) ? { mentionRoleId: value.mentionRoleId } : {}),
  };
}

export function messageOperationHttpError(error: unknown): { status: number; message: string } {
  if (error instanceof MessageOperationError) return { status: error.statusCode, message: error.message };
  if (error instanceof Error && error.message === 'IDEMPOTENCY_KEY_CONFLICT') return { status: 409, message: error.message };
  if (error instanceof Error && (error.message.startsWith('INVALID_') || error.message === 'EMPTY_MESSAGE')) return { status: 400, message: error.message };
  if (error instanceof PolicyError) return { status: 403, message: error.message };
  if (error instanceof DiscordApiError) return { status: error.status === 429 ? 429 : error.status === 404 ? 404 : error.status === 403 ? 403 : 502,
    message: error.status >= 500 || error.status === 408 ? 'Operation state could not be confirmed. Verify before retrying.' : 'Discord rejected the operation.' };
  if (error instanceof SyntaxError) return { status: 400, message: 'Invalid JSON payload.' };
  return { status: 502, message: 'Message operation could not be confirmed. Verify state before retrying.' };
}
