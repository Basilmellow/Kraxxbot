import { GuildMember, TextChannel } from 'discord.js';
import { MemberRepository } from '../database/repositories/member.repository';
import { AuditService } from './audit.service';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

export class OnboardingService {
  /**
   * Processes a newly joined guild member.
   * Assigns base @User role, registers user in database, sends welcome embed with verify button, and logs audit event.
   */
  static async handleMemberAdd(member: GuildMember): Promise<void> {
    logger.info({ discordId: member.id, tag: member.user.tag }, 'Member joined KRAXX HQ');

    try {
      // 1. Record member in database
      await MemberRepository.upsertMember({
        discordId: member.id,
        username: member.user.username,
        displayName: member.displayName,
        roleTier: 'USER',
      });

      // 2. Assign base User role if configured
      if (env.USER_ROLE_ID && env.USER_ROLE_ID.trim().length > 0) {
        const userRole = member.guild.roles.cache.get(env.USER_ROLE_ID);
        if (userRole) {
          await member.roles.add(userRole).catch(err => {
            logger.warn({ err, discordId: member.id }, 'Failed to assign @User role on join');
          });
        } else {
          logger.warn({ roleId: env.USER_ROLE_ID }, '@User role ID configured but not found in guild cache');
        }
      }

      // 3. Send clean friendly welcome message to #welcome channel
      let welcomeChannel: TextChannel | undefined = undefined;

      if (env.WELCOME_CHANNEL_ID && env.WELCOME_CHANNEL_ID.trim().length > 0) {
        welcomeChannel = member.guild.channels.cache.get(env.WELCOME_CHANNEL_ID) as TextChannel | undefined;
      }

      if (!welcomeChannel) {
        // Fallback: search for any channel named 'welcome' or 'welcomes'
        welcomeChannel = member.guild.channels.cache.find(
          c => c.isTextBased() && (c.name.toLowerCase() === 'welcome' || c.name.toLowerCase() === 'welcomes' || c.name.toLowerCase().includes('welcome'))
        ) as TextChannel | undefined;
      }

      if (welcomeChannel && welcomeChannel.isTextBased()) {
        const verifyRef = env.VERIFY_CHANNEL_ID && env.VERIFY_CHANNEL_ID.trim().length > 0
          ? `<#${env.VERIFY_CHANNEL_ID}>`
          : 'the verification channel';

        await welcomeChannel.send({
          content: `Welcome to **KRAXX HQ**, <@${member.id}>! 👋\n\nWe are glad to have you in the server. Please make sure to check out ${verifyRef} to verify your membership and get full server access.`,
        }).catch(err => {
          logger.warn({ err }, 'Failed to send welcome message to #welcome');
        });
      }

      // 4. Log audit event
      await AuditService.logEvent(
        member.guild,
        'MEMBER_JOIN',
        member.id,
        member.id,
        `New member joined KRAXX HQ as @User. Base access granted.`
      );
    } catch (error) {
      logger.error({ err: error, discordId: member.id }, 'Error handling guildMemberAdd in OnboardingService');
    }
  }
}
