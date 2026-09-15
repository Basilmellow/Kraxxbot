import { Interaction, Collection, GuildMember, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger';
import { VerificationService } from '../services/verification.service';
import { AnnouncementService } from '../services/announcement.service';
import { SelfRoleService } from '../services/selfrole.service';
import { TicketService } from '../services/ticket.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { GuildRepository } from '../database/repositories/guild.repository';

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
  } catch (_) {
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
  } catch (error) {
    logger.error({ err: error, interactionId: interaction.id }, 'Unhandled interaction error');

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
