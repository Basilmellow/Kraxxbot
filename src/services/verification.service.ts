import { ButtonInteraction, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { MemberRepository } from '../database/repositories/member.repository';
import { AuditService } from './audit.service';
import { env } from '../config/environment';
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

    if (!member) {
      const errorEmbed = KraxxEmbedBuilder.error('Verification Failed', 'Could not resolve member context.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    try {
      // 1. Ensure member entry exists in database
      const dbMember = await MemberRepository.upsertMember({
        discordId: member.id,
        username: member.user.username,
        displayName: member.displayName,
      });

      // 2. Check idempotent verification status
      if (dbMember.isVerified) {
        await MemberRepository.logVerificationAttempt(member.id, 'ALREADY_VERIFIED', 'User clicked verify when already verified');
        const alreadyEmbed = KraxxEmbedBuilder.success(
          'Verification Active',
          'Your KRAXX HQ membership is already verified. Access has been established.'
        );
        await interaction.reply({ embeds: [alreadyEmbed], ephemeral: true });
        return;
      }

      // 3. Update database verification status
      await MemberRepository.markVerified(member.id);
      await MemberRepository.logVerificationAttempt(member.id, 'SUCCESS', 'Membership verified successfully');

      // 4. Assign base User role if missing
      if (env.USER_ROLE_ID && env.USER_ROLE_ID.trim().length > 0) {
        const userRole = member.guild.roles.cache.get(env.USER_ROLE_ID);
        if (userRole && !member.roles.cache.has(userRole.id)) {
          await member.roles.add(userRole).catch(err => {
            logger.warn({ err, discordId: member.id }, 'Failed to assign @User role during verification');
          });
        }
      }

      // 5. Send clean ephemeral response
      const successEmbed = KraxxEmbedBuilder.success(
        'Verification Complete',
        'Your membership has been successfully verified. Welcome to KRAXX HQ.'
      );
      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      // 6. Log audit event
      await AuditService.logEvent(
        member.guild,
        'MEMBER_VERIFIED',
        member.id,
        member.id,
        `Member ${member.user.tag} successfully completed verification.`
      );
    } catch (error) {
      logger.error({ err: error, discordId: member.id }, 'Verification process encountered an exception');
      await MemberRepository.logVerificationAttempt(member.id, 'FAILED', String(error)).catch(() => {});

      const errorEmbed = KraxxEmbedBuilder.error(
        'Verification Error',
        'An error occurred while processing your verification. Please try again or contact management.'
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
}
