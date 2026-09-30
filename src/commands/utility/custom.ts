import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Prisma } from '@prisma/client';
import { MessageOperationService, type MessageOperationAdapter, type MessageOperationInput } from '../../services/message-operation.service';
import { canExecuteCustomCommand, CustomCommandService } from '../../services/custom-command.service';

function dispatcher(interaction: ChatInputCommandInteraction) {
  const adapter: MessageOperationAdapter = {
    async authorize(operation) {
      if (!interaction.guild || interaction.guildId !== operation.guildId || operation.channelId !== interaction.channelId) throw new Error('CUSTOM_COMMAND_TENANT_MISMATCH');
      await interaction.guild.members.fetch(operation.actorId);
      const channel = await interaction.guild.channels.fetch(operation.channelId);
      if (!channel || channel.guildId !== operation.guildId || !channel.isTextBased() || !('send' in channel)) throw new Error('CUSTOM_COMMAND_CHANNEL_INVALID');
      const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
      if (!(channel as any).permissionsFor(botMember)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw new Error('CUSTOM_COMMAND_BOT_PERMISSION_DENIED');
    },
    async send(args) {
      const channel = await interaction.guild!.channels.fetch(args.channelId) as any;
      const message = await channel.send({ content: args.content, allowedMentions: { parse: [] }, nonce: args.nonce, enforceNonce: true });
      return { messageId: message.id };
    },
    async edit() { throw new Error('CUSTOM_COMMAND_EDIT_UNSUPPORTED'); },
    async delete() { throw new Error('CUSTOM_COMMAND_DELETE_UNSUPPORTED'); },
  };
  return (input: MessageOperationInput, beforeCreate?: (tx: Prisma.TransactionClient) => Promise<void>) =>
    MessageOperationService.execute(input, adapter, beforeCreate);
}

export default {
  data: new SlashCommandBuilder().setName('custom').setDescription('Run a server-configured custom response')
    .addStringOption(option => option.setName('trigger').setDescription('Configured command trigger').setRequired(true).setMinLength(1).setMaxLength(32)),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.guildId) { await interaction.reply({ content: 'Custom commands are only available in servers.', ephemeral: true }); return; }
    if (!canExecuteCustomCommand(Boolean(interaction.guild && interaction.guildId), interaction.user.bot)) {
      await interaction.reply({ content: 'Bots cannot run custom commands.', ephemeral: true }); return;
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const trigger = interaction.options.getString('trigger', true).trim().toLowerCase();
      const vars = { user: interaction.user.username, mention: `<@${interaction.user.id}>`, guild: interaction.guild.name,
        channel: 'name' in (interaction.channel || {}) ? String((interaction.channel as any).name) : '' };
      const outcome = await CustomCommandService.execute({ guildId: interaction.guildId, trigger, actorId: interaction.user.id,
        channelId: interaction.channelId, eventId: interaction.id, vars, authorize: async () => {
          const member = await interaction.guild!.members.fetch(interaction.user.id);
          if (member.user.bot || member.guild.id !== interaction.guildId) throw new Error('CUSTOM_COMMAND_ACTOR_INVALID');
          const channel = await interaction.guild!.channels.fetch(interaction.channelId);
          if (!channel || channel.guildId !== interaction.guildId || !channel.isTextBased() || !('send' in channel)) throw new Error('CUSTOM_COMMAND_CHANNEL_INVALID');
          const botMember = interaction.guild!.members.me || await interaction.guild!.members.fetchMe();
          if (!(channel as any).permissionsFor(botMember)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw new Error('CUSTOM_COMMAND_BOT_PERMISSION_DENIED');
        } }, (operation, beforeCreate) => dispatcher(interaction)({
          guildId: interaction.guildId!, actorId: interaction.user.id, source: 'BOT', operationType: 'SEND',
          idempotencyKey: operation.idempotencyKey, channelId: interaction.channelId, content: operation.content, mentionMode: 'NONE',
        }, beforeCreate));
      await interaction.editReply(outcome.status === 'SUCCESS' ? 'Custom response sent.' : outcome.status === 'UNKNOWN'
        ? 'Delivery is unconfirmed. Please do not retry; a moderator can verify the message.' : 'The response could not be delivered.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const safe: Record<string, string> = { MODULE_DISABLED: 'Custom Commands is disabled for this server.', COMMAND_NOT_FOUND: 'That custom command is not available.',
        COMMAND_COOLDOWN: 'That command is on cooldown for you.', CUSTOM_COMMAND_BOT_PERMISSION_DENIED: 'The bot cannot send messages in this channel.' };
      await interaction.editReply(safe[code] || 'The custom command could not be completed.');
    }
  },
};
