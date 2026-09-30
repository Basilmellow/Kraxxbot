import { ButtonInteraction,ChatInputCommandInteraction,GuildMember } from 'discord.js';
import { MemberRepository } from '../database/repositories/member.repository';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { validateAutomaticRole } from '../security/automatic-role';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';
import { GuildRepository } from '../database/repositories/guild.repository';
import { discordRequest, DiscordApiError } from './discord-transport';

export class VerificationService {
  /**
   * Handles member verification idempotently from a button interaction or slash command.
   */
  static async processVerification(
    interaction: ButtonInteraction | ChatInputCommandInteraction
  ): Promise<void> {
    const member = interaction.member as GuildMember | null;
    const guild = interaction.guild;

    if (!member || !guild || member.guild.id !== guild.id || member.user.id !== member.id) {
      const errorEmbed = KraxxEmbedBuilder.error('Verification Failed', 'Could not resolve server or member context.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    try {
      if (!(await GuildRepository.isModuleEnabled(guild.id, 'welcome'))) {
        await interaction.reply({ embeds: [KraxxEmbedBuilder.error('Verification Unavailable', 'Verification is disabled for this server.')], ephemeral: true });
        return;
      }

      // 1. Ensure member entry exists in database
      const dbMember = await MemberRepository.upsertMember({
        guildId: guild.id,
        discordId: member.id,
        username: member.user.username,
        displayName: member.displayName,
        avatar: member.user.avatarURL(),
      });

      // 2. Check idempotent verification status
      if (dbMember.isVerified) {
        await MemberRepository.logVerificationAttempt(
          guild.id,
          member.id,
          'ALREADY_VERIFIED',
          'User clicked verify when already verified'
        );
        const alreadyEmbed = KraxxEmbedBuilder.success(
          'Already Verified',
          `Your membership in **${guild.name}** is already verified.`
        );
        await interaction.reply({ embeds: [alreadyEmbed], ephemeral: true });
        return;
      }

      // 3. Assign the configured role first. A failed Discord mutation must not leave a
      // verified database record that prevents a safe retry.
      const welcomeConfig = await (await import('../database/client')).prisma.welcomeConfig.findUnique({
        where: { guildId: guild.id },
      });
      const targetRoleId = welcomeConfig?.roleId;
      if (targetRoleId) {
        const role = await validateAutomaticRole(guild, targetRoleId);
        if (!member.roles.cache.has(role.id)) {
          const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
          if (!token) throw new Error('DISCORD_NOT_CONFIGURED');
          await discordRequest(`https://discord.com/api/v10/guilds/${guild.id}/members/${member.id}/roles/${role.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bot ${token}`, 'X-Audit-Log-Reason': encodeURIComponent('Member verification') },
          });
        }
      }

      // 4. Persist verified state, verification attempt, and canonical audit atomically.
      await MemberRepository.markVerified(guild.id, member.id);

      // 5. Send clean ephemeral response
      const successEmbed = KraxxEmbedBuilder.success(
        'Verification Complete',
        `Your membership has been successfully verified. Welcome to **${guild.name}**!`
      );
      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      // 6. Log audit event
      await AuditService.logEvent(
        guild,
        'MEMBER_VERIFIED',
        member.id,
        member.id,
        `Member ${member.user.tag} completed verification in ${guild.name}.`,
        'SUCCESS',
        false,
      ).catch((notifyError) => logger.warn({ errorType: notifyError instanceof Error ? notifyError.name : 'UnknownError', guildId: guild.id }, 'Could not notify the configured audit channel'));
    } catch (error) {
      const errorCode = error instanceof DiscordApiError ? `DISCORD_${error.status}` : 'VERIFICATION_FAILED';
      logger.error({ errorCode, discordId: member.id, guildId: guild.id }, 'Verification process encountered an exception');
      await MemberRepository.logVerificationAttempt(guild.id, member.id, 'FAILED', errorCode).catch(() => {});

      const errorEmbed = KraxxEmbedBuilder.error(
        'Verification Error',
        'An error occurred while processing your verification. Please try again or contact server staff.'
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
}
