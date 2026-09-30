import { ActionRowBuilder, ButtonInteraction, Collection,GuildMember,Interaction,ModalBuilder,PermissionFlagsBits,TextInputBuilder,TextInputStyle } from 'discord.js';
import { GuildRepository } from '../database/repositories/guild.repository';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { AnnouncementService } from '../services/announcement.service';
import { AuditService } from '../services/audit.service';
import { SelfRoleService } from '../services/selfrole.service';
import { TicketService } from '../services/ticket.service';
import { VerificationService } from '../services/verification.service';
import { logger } from '../utils/logger';
import { PollService, parsePollOptions, pollInteractionMatches } from '../services/poll.service';
import { prisma } from '../database/client';
import { MessageOperationService, type MessageOperationAdapter, type MessageOperationInput } from '../services/message-operation.service';
import { SuggestionService, suggestionPanelMatches } from '../services/suggestion.service';

async function submitSuggestionModal(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.guildId) { await interaction.reply({ content: 'Suggestions are only available in a server.', ephemeral: true }); return; }
  const settings = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId: interaction.guildId, module: 'social' } } });
  let config: any;
  try { config = JSON.parse(settings?.config || '{}'); } catch { config = {}; }
  if (!suggestionPanelMatches({ enabled: settings?.enabled, guildId: config.suggestionGuildId, channelId: config.suggestionChannelId, messageId: config.suggestionPanelMessageId },
    { guildId: interaction.guildId, channelId: interaction.channelId, messageId: interaction.message.id })) {
    await interaction.reply({ content: 'This suggestion panel is no longer configured for this server.', ephemeral: true }); return;
  }
  await interaction.guild.members.fetch(interaction.user.id);
  const title = new TextInputBuilder().setCustomId('suggestion_title').setLabel('Suggestion title').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true);
  const content = new TextInputBuilder().setCustomId('suggestion_content').setLabel('Describe your idea').setStyle(TextInputStyle.Paragraph).setMaxLength(3000).setRequired(true);
  const modal = new ModalBuilder().setCustomId(`kraxx_suggestion_modal:${interaction.message.id}`).setTitle('Submit a suggestion')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(title), new ActionRowBuilder<TextInputBuilder>().addComponents(content));
  await interaction.showModal(modal);
}

function suggestionDispatcher(interaction: Interaction) {
  const adapter: MessageOperationAdapter = {
    async authorize(operation) {
      if (!interaction.guild || !interaction.guildId || interaction.guildId !== operation.guildId) throw new Error('SUGGESTION_GUILD_MISMATCH');
      const member = await interaction.guild.members.fetch(operation.actorId);
      const module = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId: operation.guildId, module: 'social' } } });
      if (!module?.enabled) throw new Error('SUGGESTIONS_DISABLED');
      let config: any = {};
      try { config = JSON.parse(module.config || '{}'); } catch { throw new Error('SUGGESTION_CONFIGURATION_INVALID'); }
      if (config.suggestionChannelId !== operation.channelId) throw new Error('SUGGESTION_CHANNEL_MISMATCH');
      const channel = await interaction.guild.channels.fetch(operation.channelId);
      if (!channel || channel.guildId !== operation.guildId || !channel.isTextBased() || !('send' in channel)) throw new Error('SUGGESTION_CHANNEL_INVALID');
      const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
      const permissions = channel.permissionsFor(botMember);
      if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) throw new Error('SUGGESTION_BOT_PERMISSION_DENIED');
      if (operation.operationType === 'EDIT') {
        const message = await (channel as any).messages.fetch(operation.targetMessageId);
        if (message.id !== operation.targetMessageId || message.author.id !== interaction.client.user?.id) throw new Error('SUGGESTION_MESSAGE_MISMATCH');
      }
      void member;
    },
    async send(args) {
      const channel = await interaction.guild!.channels.fetch(args.channelId) as any;
      const message = await channel.send({ content: args.content, embeds: args.embeds, components: args.components, allowedMentions: args.allowedMentions,
        nonce: args.nonce, enforceNonce: true });
      return { messageId: message.id };
    },
    async edit(args) {
      const channel = await interaction.guild!.channels.fetch(args.channelId) as any;
      const message = await channel.messages.fetch(args.messageId);
      const edited = await message.edit({ content: args.content, embeds: args.embeds, components: args.components, allowedMentions: args.allowedMentions });
      return { messageId: edited.id };
    },
    async delete() { throw new Error('SUGGESTION_DELETE_UNSUPPORTED'); },
  };
  return (operation: MessageOperationInput) => MessageOperationService.execute(operation, adapter);
}

async function handleSuggestionSubmit(interaction: Interaction): Promise<void> {
  if (!interaction.isModalSubmit() || !interaction.guild || !interaction.guildId) return;
  const module = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId: interaction.guildId, module: 'social' } } });
  if (!module?.enabled) { await interaction.reply({ content: 'Suggestions are disabled for this server.', ephemeral: true }); return; }
  let config: any;
  try { config = JSON.parse(module.config || '{}'); } catch { await interaction.reply({ content: 'Suggestions are not configured correctly.', ephemeral: true }); return; }
  const channelId = config.suggestionChannelId;
  if (typeof channelId !== 'string') { await interaction.reply({ content: 'Suggestions are not configured yet.', ephemeral: true }); return; }
  const panelId = interaction.customId.split(':')[1];
  if (!suggestionPanelMatches({ enabled: module.enabled, guildId: config.suggestionGuildId, channelId, messageId: config.suggestionPanelMessageId },
    { guildId: interaction.guildId, channelId: interaction.channelId, messageId: panelId })) {
    await interaction.reply({ content: 'This suggestion form is stale or was opened outside the configured panel.', ephemeral: true }); return;
  }
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member) { await interaction.reply({ content: 'Server membership could not be verified.', ephemeral: true }); return; }
  const outcome = await SuggestionService.submit({ guildId: interaction.guildId, actorId: interaction.user.id, channelId,
    title: interaction.fields.getTextInputValue('suggestion_title'), content: interaction.fields.getTextInputValue('suggestion_content'), idempotencyKey: interaction.id },
    async () => { await interaction.guild!.members.fetch(interaction.user.id); }, suggestionDispatcher(interaction));
  await interaction.reply({ content: outcome.operationStatus === 'SUCCESS' ? 'Your suggestion was submitted.'
    : outcome.operationStatus === 'FAILURE' ? 'Discord rejected the suggestion. It was recorded for staff follow-up.'
    : 'Your suggestion is recorded, but Discord delivery is unconfirmed. Please do not resubmit; staff can verify delivery.', ephemeral: true });
}

async function handlePollVote(interaction: ButtonInteraction): Promise<void> {
  const match = /^kraxx_poll:([0-9a-f-]{36}):(\d+)$/.exec(interaction.customId);
  if (!match || !interaction.guildId || !interaction.guild) {
    await interaction.reply({ content: 'This poll control is invalid or no longer available.', ephemeral: true });
    return;
  }
  const [, pollId, rawOption] = match;
  const optionIndex = Number(rawOption);
  const poll = await prisma.poll.findFirst({ where: { id: pollId, guildId: interaction.guildId } });
  if (!poll) {
    await interaction.reply({ content: 'This poll does not belong to this server or message.', ephemeral: true });
    return;
  }
  const options = parsePollOptions(poll.options);
  if (!pollInteractionMatches(poll, { pollId, guildId: interaction.guildId, channelId: interaction.channelId,
    messageId: interaction.message.id, optionIndex }, options.length)) {
    await interaction.reply({ content: 'That poll option is invalid.', ephemeral: true });
    return;
  }
  if (poll.status !== 'ACTIVE') {
    await interaction.reply({ content: 'This poll is closed and can no longer accept votes.', ephemeral: true });
    return;
  }
  await interaction.guild.members.fetch(interaction.user.id);
  if (poll.expiresAt && poll.expiresAt <= new Date() && poll.status === 'ACTIVE') {
    await PollService.close({ guildId: poll.guildId, pollId: poll.id, actorId: poll.createdBy, reason: 'EXPIRED' });
    await interaction.reply({ content: 'This poll has expired and is now closed.', ephemeral: true });
    return;
  }
  let result;
  try {
    result = await PollService.vote({ guildId: interaction.guildId, pollId, userId: interaction.user.id, optionIndex });
  } catch (error) {
    if (error instanceof Error && error.message === 'POLL_CLOSED') {
      await interaction.reply({ content: 'This poll is closed and can no longer accept votes.', ephemeral: true });
      return;
    }
    throw error;
  }
  await interaction.reply({ content: result.status === 'VOTED'
    ? `Your vote for “${options[optionIndex].text}” was recorded. Votes cannot be changed.`
    : `You already voted for “${options[result.optionIndex].text}”. Votes cannot be changed.`, ephemeral: true });
}

/**
 * Checks if a GuildMember can manage tickets in any guild.
 * Multi-tenant logic: checks Discord-native permissions first,
 * then falls back to GuildSettings configured roles.
 */
async function canManageTickets(member: GuildMember, guildId: string): Promise<boolean> {
  // Discord-native permission check (works across all guilds)
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages)
  ) {
    return true;
  }

  // Fall back to configured support/staff roles in GuildSettings
  try {
    const guild = await GuildRepository.findById(guildId);
    const settings = guild?.settings;
    if (settings) {
      const configuredRoles = [
        settings.adminRoleId,
        settings.modRoleId,
        settings.supportRoleId,
        settings.staffRoleId,
      ].filter(Boolean) as string[];

      for (const roleId of configuredRoles) {
        if (member.roles.cache.has(roleId)) return true;
      }
    }
  } catch {
    // If DB lookup fails, fall back to denying
  }

  return false;
}

export async function onInteractionCreate(
  interaction: Interaction,
  commandMap: Collection<string, any>
): Promise<void> {
  try {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName);
      if (!command) {
        logger.warn({ commandName: interaction.commandName }, 'Command not found in commandMap');
        return;
      }

      await command.execute(interaction);
      return;
    }

    // 2. Handle Button Interactions
    if (interaction.isButton()) {
      if (interaction.customId === 'kraxx_suggestion_submit') { await submitSuggestionModal(interaction); return; }
      if (interaction.customId.startsWith('kraxx_poll:')) {
        await handlePollVote(interaction);
        return;
      }
      if (interaction.customId === 'kraxx_verify') {
        await VerificationService.processVerification(interaction);
        return;
      }

      if (interaction.customId.startsWith('kraxx_ticket_create')) {
        const parts = interaction.customId.split(':');
        const category = parts[1] || 'GENERAL';
        await TicketService.handleCreateTicketButton(interaction, category);
        return;
      }

      const mgmtTicketButtons = [
        'kraxx_ticket_claim',
        'kraxx_ticket_close',
        'kraxx_ticket_transcript',
        'kraxx_ticket_reopen',
        'kraxx_ticket_delete',
      ];

      if (mgmtTicketButtons.includes(interaction.customId)) {
        const member = interaction.member as GuildMember;
        const guildId = interaction.guildId!;

        const authorized = await canManageTickets(member, guildId);
        if (!authorized) {
          await interaction.reply({
            content: 'You do not have permission to manage tickets.',
            ephemeral: true,
          });
          return;
        }

        if (interaction.customId === 'kraxx_ticket_claim') {
          await TicketService.claimTicket(interaction);
          return;
        }

        if (interaction.customId === 'kraxx_ticket_close') {
          await TicketService.closeTicket(interaction);
          return;
        }

        if (interaction.customId === 'kraxx_ticket_transcript') {
          await TicketService.generateTranscript(interaction);
          return;
        }

        if (interaction.customId === 'kraxx_ticket_reopen') {
          await TicketService.reopenTicket(interaction);
          return;
        }

        if (interaction.customId === 'kraxx_ticket_delete') {
          await TicketService.deleteTicketChannel(interaction);
          return;
        }
      }

      return;
    }

    // 3. Handle Select Menus
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'kraxx_selfrole_select') {
        await SelfRoleService.handleRoleSelection(interaction);
        return;
      }
      return;
    }

    // 4. Handle Modal Submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('kraxx_suggestion_modal:')) { await handleSuggestionSubmit(interaction); return; }
      if (interaction.customId === 'kraxx_announce_modal') {
        await AnnouncementService.handleAnnouncementSubmit(interaction);
        return;
      }

      if (interaction.customId.startsWith('kraxx_say_modal')) {
        const parts = interaction.customId.split(':');
        const targetChannelId = parts[1] || undefined;
        const messageContent = interaction.fields.getTextInputValue('say_content');

        let targetChannel: any = undefined;
        if (targetChannelId && interaction.guild) {
          targetChannel = interaction.guild.channels.cache.get(targetChannelId);
        }

        const { SayService } = await import('../services/say.service');
        await SayService.sendSay(interaction, messageContent, targetChannel);
        return;
      }
      return;
    }
  } catch {
    logger.error({ interactionId: interaction.id, guildId: interaction.guildId }, 'Interaction failed');
    if (interaction.guild) await AuditService.logEvent(interaction.guild, 'INTERACTION_FAILED', interaction.user.id, interaction.id, 'Operation failed', 'FAILURE').catch(() => logger.error({guildId:interaction.guildId}, 'AUDIT_WRITE_FAILED'));

    const errorEmbed = KraxxEmbedBuilder.error(
      'System Error',
      'An error occurred while processing your request.'
    );

    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  }
}
