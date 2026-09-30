import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { createKraxxAiDelivery } from '../../services/kraxx-ai-discord';
import { executeKraxxAi, KraxxAiError } from '../../services/kraxx-ai.service';
import { logger } from '../../utils/logger';
import { userSafeAiError } from '../../services/kraxx-ai-provider';

export default {
  data: new SlashCommandBuilder().setName('ask').setDescription('Ask Kraxx AI a question')
    .addStringOption(option => option.setName('question').setDescription('Your question (no channel history is included)').setMinLength(1).setMaxLength(2000).setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.guild || !interaction.guildId || !interaction.channelId) {
      await interaction.reply({ content: 'Kraxx AI can only be used in a server.', ephemeral: true }); return;
    }
    const prompt = interaction.options.getString('question', true);
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (error) {
      logger.warn({ guildId: interaction.guildId, requestId: interaction.id,
        errorType: error instanceof Error ? error.name : 'UnknownError' }, 'Kraxx AI interaction acknowledgement failed before request processing');
      return;
    }
    try {
      const outcome = await executeKraxxAi({ guildId: interaction.guildId, userId: interaction.user.id, channelId: interaction.channelId,
        requestId: interaction.id, prompt, verifyMembership: async () => Boolean(await interaction.guild!.members.fetch(interaction.user.id)),
        verifyChannel: async () => { const channel = await interaction.guild!.channels.fetch(interaction.channelId!); return Boolean(channel && channel.guildId === interaction.guildId && channel.isTextBased() && 'send' in channel); } },
      createKraxxAiDelivery(interaction.guild));
      const reply = outcome.error ? userSafeAiError(outcome.error)
        : outcome.status === 'SUCCESS' ? 'Your answer was sent in this channel.'
          : outcome.status === 'UNKNOWN' ? 'The answer delivery is unconfirmed. Please check the channel before retrying.'
            : 'I could not send the answer. Please try again shortly.';
      await interaction.editReply(reply);
    } catch (error) {
      const message = error instanceof KraxxAiError ? ({ SERVER_ONLY: "AI isn't configured for this server yet.", INVALID_CONTEXT: 'This request is invalid.', NOT_A_MEMBER: 'Server membership could not be verified.',
        MODULE_UNAVAILABLE: 'Kraxx AI is unavailable for this server.', DISABLED: 'Kraxx AI is disabled for this server.', MISCONFIGURED: 'Kraxx AI is not configured correctly.',
        CHANNEL_NOT_ALLOWED: 'Kraxx AI is not enabled in this channel.', EMPTY_PROMPT: 'Enter a question first.', PROMPT_TOO_LONG: 'That question is too long.',
        DUPLICATE: 'This request has already been processed. Check the channel before retrying.', RATE_LIMITED: 'You are sending requests too quickly. Try again shortly.', INVALID_CHANNEL: 'Kraxx AI can only be used in a text channel in this server.', AI_UNAVAILABLE: 'AI is temporarily unavailable. Try again in a moment.' }[error.code]) : 'AI is temporarily unavailable. Try again in a moment.';
      await interaction.editReply(message).catch(error => {
        logger.warn({ guildId: interaction.guildId, requestId: interaction.id,
          errorType: error instanceof Error ? error.name : 'UnknownError' }, 'Kraxx AI safe error response could not be delivered');
      });
    }
  },
};
