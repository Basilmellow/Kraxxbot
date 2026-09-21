import { ButtonInteraction, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { MemberRepository } from '../database/repositories/member.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class VerificationService {
  /**
   * Handles member verification idempotently from a button interaction or slash command.
   */
  static async processVerification(
    interaction: ButtonInteraction | ChatInputCommandInteraction
  ): Promise<void> {
    const member = interaction.member as GuildMember | null;
    const guild = interaction.guild;

    if (!member || !guild) {
      const errorEmbed = KraxxEmbedBuilder.error('Verification Failed', 'Could not resolve server or member context.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    try {
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

      // 3. Update database verification status
      await MemberRepository.markVerified(guild.id, member.id);
      await MemberRepository.logVerificationAttempt(
        guild.id,
        member.id,
        'SUCCESS',
        'Membership verified successfully'
      );

      // 4. Assign configured auto-role or verified role if configured in WelcomeConfig
      const welcomeConfig = await (await import('../database/client')).prisma.welcomeConfig.findUnique({
        where: { guildId: guild.id },
      });

      const targetRoleId = welcomeConfig?.roleId;
      if (targetRoleId) {
        const role = guild.roles.cache.get(targetRoleId);
        if (role && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(err => {
            logger.warn({ err, discordId: member.id, guildId: guild.id }, 'Failed to assign verified role');
          });
        }
      }

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
        `Member ${member.user.tag} completed verification in ${guild.name}.`
      );
    } catch (error) {
      logger.error({ err: error, discordId: member.id, guildId: guild.id }, 'Verification process encountered an exception');
      await MemberRepository.logVerificationAttempt(guild.id, member.id, 'FAILED', String(error)).catch(() => {});

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
