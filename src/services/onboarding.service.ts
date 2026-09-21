import { GuildMember, TextChannel } from 'discord.js';
import { GuildRepository } from '../database/repositories/guild.repository';
import { MemberRepository } from '../database/repositories/member.repository';
import { AuditService } from './audit.service';
import { logger } from '../utils/logger';

export class OnboardingService {
  /**
   * Processes a newly joined guild member.
   * Reads WelcomeConfig for the active guild — fully multi-tenant, no hardcoded KRAXX HQ behaviour.
   */
  static async handleMemberAdd(member: GuildMember): Promise<void> {
    const guildId = member.guild.id;
    logger.info({ discordId: member.id, guildId, tag: member.user.tag }, 'Member joined guild');

    try {
      // 1. Ensure guild is registered in database
      const guildData = await GuildRepository.findById(guildId);
      if (!guildData) {
        logger.warn({ guildId }, 'Guild not found in DB during member join — skipping onboarding');
        return;
      }

      // 2. Record / update member in database (guild-scoped)
      await MemberRepository.upsertMember({
        guildId,
        discordId: member.id,
        username: member.user.username,
        displayName: member.displayName,
        avatar: member.user.avatar,
        roleTier: 'USER',
      });

      // 3. Assign configured auto-role from WelcomeConfig (if set and valid)
      const welcomeConfig = guildData.welcomeConfig;
      if (welcomeConfig?.enabled && welcomeConfig.roleId) {
        const autoRole = member.guild.roles.cache.get(welcomeConfig.roleId);
        if (autoRole) {
          await member.roles.add(autoRole).catch(err => {
            logger.warn({ err, discordId: member.id, roleId: welcomeConfig.roleId }, 'Failed to assign auto-role on join');
          });
        } else {
          logger.warn({ roleId: welcomeConfig.roleId, guildId }, 'Auto-role configured but not found in guild cache');
        }
      }

      // 4. Send welcome message to the guild's configured welcome channel
      if (welcomeConfig?.enabled && welcomeConfig.channelId) {
        const welcomeChannel = member.guild.channels.cache.get(welcomeConfig.channelId) as TextChannel | undefined;

        if (welcomeChannel?.isTextBased()) {
          // Interpolate dynamic placeholders in the welcome message
          const rawMessage = welcomeConfig.message
            || `Welcome to **${member.guild.name}**, <@${member.id}>! 👋`;

          const finalMessage = rawMessage
            .replace(/\{user\}/g, `<@${member.id}>`)
            .replace(/\{server\}/g, member.guild.name)
            .replace(/\{memberCount\}/g, String(member.guild.memberCount));

          await welcomeChannel.send({ content: finalMessage }).catch(err => {
            logger.warn({ err, guildId }, 'Failed to send welcome message');
          });
        }
      }

      // 5. Log audit event (guild-scoped)
      await AuditService.logEvent(
        member.guild,
        'MEMBER_JOIN',
        member.id,
        member.id,
        `Member joined ${member.guild.name}`,
      );
    } catch (error) {
      logger.error({ err: error, discordId: member.id, guildId }, 'Error in OnboardingService.handleMemberAdd');
    }
  }

  /**
   * Processes a member leaving a guild.
   */
  static async handleMemberRemove(member: GuildMember): Promise<void> {
    const guildId = member.guild.id;
    logger.info({ discordId: member.id, guildId, tag: member.user.tag }, 'Member left guild');

    try {
      const guildData = await GuildRepository.findById(guildId);
      if (!guildData) return;

      // Send leave message if configured
      const welcomeConfig = guildData.welcomeConfig;
      if (welcomeConfig?.enabled && welcomeConfig.leaveChannelId && welcomeConfig.leaveMessage) {
        const leaveChannel = member.guild.channels.cache.get(welcomeConfig.leaveChannelId) as TextChannel | undefined;

        if (leaveChannel?.isTextBased()) {
          const leaveMsg = welcomeConfig.leaveMessage
            .replace(/\{user\}/g, member.user.tag)
            .replace(/\{server\}/g, member.guild.name)
            .replace(/\{memberCount\}/g, String(member.guild.memberCount));

          await leaveChannel.send({ content: leaveMsg }).catch(err => {
            logger.warn({ err, guildId }, 'Failed to send leave message');
          });
        }
      }

      await AuditService.logEvent(
        member.guild,
        'MEMBER_LEAVE',
        member.id,
        member.id,
        `Member left ${member.guild.name}`,
      );
    } catch (error) {
      logger.error({ err: error, discordId: member.id, guildId }, 'Error in OnboardingService.handleMemberRemove');
    }
  }
}
