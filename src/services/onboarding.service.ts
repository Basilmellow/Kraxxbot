import { GuildMember } from 'discord.js';
import { GuildRepository } from '../database/repositories/guild.repository';
import { MemberRepository } from '../database/repositories/member.repository';
import { validateAutomaticRole } from '../security/automatic-role';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';
import { AutomationExecutionService } from './automation-execution.service';

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

      if (member.joinedTimestamp) {
        await AutomationExecutionService.enqueueMemberEvent({
          guildId,
          eventType: 'MEMBER_JOIN',
          eventId: `${member.id}:${member.joinedTimestamp}`,
          userId: member.id,
          username: member.user.username,
          displayName: member.displayName,
          serverName: member.guild.name,
          memberCount: member.guild.memberCount,
        }).catch((error) => logger.error({ guildId, userId: member.id, errorType: error instanceof Error ? error.name : 'UnknownError' }, 'Could not enqueue member-join automations'));
      }

      // Welcome deliveries and rule-based automations are independently gated by their module states.
      if (await GuildRepository.isModuleEnabled(guildId, 'welcome')) {
        const welcomeConfig = guildData.welcomeConfig;
        if (welcomeConfig?.enabled && welcomeConfig.roleId) {
          try {
            const autoRole = await validateAutomaticRole(member.guild, welcomeConfig.roleId);
            if (!member.roles.cache.has(autoRole.id)) await member.roles.add(autoRole);
          } catch (err) {
            logger.warn({ errorType: err instanceof Error ? err.name : 'UnknownError', guildId, roleId: welcomeConfig.roleId }, 'Failed to assign auto-role on join');
          }
        }
        if (welcomeConfig?.enabled && member.joinedTimestamp) {
          await AutomationExecutionService.enqueueWelcomeMemberEvent({
            guildId,
            eventType: 'MEMBER_JOIN',
            eventId: `${member.id}:${member.joinedTimestamp}`,
            config: welcomeConfig,
            userId: member.id,
            username: member.user.username,
            displayName: member.displayName,
            serverName: member.guild.name,
            memberCount: member.guild.memberCount,
          }).catch(async (error) => {
            const errorType = error instanceof Error ? error.name : 'UnknownError';
            logger.error({ guildId, userId: member.id, errorType }, 'Could not enqueue durable welcome delivery');
            await AuditService.logEvent(member.guild, 'WELCOME_DELIVERY_ENQUEUE', member.id, member.id,
              JSON.stringify({ outcome: 'FAILURE', errorType }), 'FAILURE').catch(() => {});
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

      if (await GuildRepository.isModuleEnabled(guildId, 'welcome')) {
        const welcomeConfig = guildData.welcomeConfig;
        if (welcomeConfig?.enabled && welcomeConfig.leaveChannelId && member.joinedTimestamp) {
          await AutomationExecutionService.enqueueWelcomeMemberEvent({
            guildId,
            eventType: 'MEMBER_LEAVE',
            eventId: `${member.id}:${member.joinedTimestamp}`,
            config: welcomeConfig,
            userId: member.id,
            username: member.user.username,
            displayName: member.displayName,
            serverName: member.guild.name,
            memberCount: member.guild.memberCount,
          }).catch(async (error) => {
            const errorType = error instanceof Error ? error.name : 'UnknownError';
            logger.error({ guildId, userId: member.id, errorType }, 'Could not enqueue durable goodbye delivery');
            await AuditService.logEvent(member.guild, 'GOODBYE_DELIVERY_ENQUEUE', member.id, member.id,
              JSON.stringify({ outcome: 'FAILURE', errorType }), 'FAILURE').catch(() => {});
          });
        }
      }

      if (member.joinedTimestamp) {
        await AutomationExecutionService.enqueueMemberEvent({
          guildId,
          eventType: 'MEMBER_LEAVE',
          eventId: `${member.id}:${member.joinedTimestamp}`,
          userId: member.id,
          username: member.user.username,
          displayName: member.displayName,
          serverName: member.guild.name,
          memberCount: member.guild.memberCount,
        }).catch((error) => logger.error({ guildId, userId: member.id, errorType: error instanceof Error ? error.name : 'UnknownError' }, 'Could not enqueue member-leave automations'));
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
