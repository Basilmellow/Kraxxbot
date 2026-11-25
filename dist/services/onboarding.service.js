"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const guild_repository_1 = require("../database/repositories/guild.repository");
const member_repository_1 = require("../database/repositories/member.repository");
const automatic_role_1 = require("../security/automatic-role");
const logger_1 = require("../utils/logger");
const audit_service_1 = require("./audit.service");
const automation_execution_service_1 = require("./automation-execution.service");
class OnboardingService {
    /**
     * Processes a newly joined guild member.
     * Reads WelcomeConfig for the active guild — fully multi-tenant, no hardcoded KRAXX HQ behaviour.
     */
    static async handleMemberAdd(member) {
        const guildId = member.guild.id;
        logger_1.logger.info({ discordId: member.id, guildId, tag: member.user.tag }, 'Member joined guild');
        try {
            // 1. Ensure guild is registered in database
            const guildData = await guild_repository_1.GuildRepository.findById(guildId);
            if (!guildData) {
                logger_1.logger.warn({ guildId }, 'Guild not found in DB during member join — skipping onboarding');
                return;
            }
            // 2. Record / update member in database (guild-scoped)
            await member_repository_1.MemberRepository.upsertMember({
                guildId,
                discordId: member.id,
                username: member.user.username,
                displayName: member.displayName,
                avatar: member.user.avatar,
                roleTier: 'USER',
            });
            if (member.joinedTimestamp) {
                await automation_execution_service_1.AutomationExecutionService.enqueueMemberEvent({
                    guildId,
                    eventType: 'MEMBER_JOIN',
                    eventId: `${member.id}:${member.joinedTimestamp}`,
                    userId: member.id,
                    username: member.user.username,
                    displayName: member.displayName,
                    serverName: member.guild.name,
                    memberCount: member.guild.memberCount,
                }).catch((error) => logger_1.logger.error({ guildId, userId: member.id, errorType: error instanceof Error ? error.name : 'UnknownError' }, 'Could not enqueue member-join automations'));
            }
            // Welcome deliveries and rule-based automations are independently gated by their module states.
            if (await guild_repository_1.GuildRepository.isModuleEnabled(guildId, 'welcome')) {
                const welcomeConfig = guildData.welcomeConfig;
                if (welcomeConfig?.enabled && welcomeConfig.roleId) {
                    try {
                        const autoRole = await (0, automatic_role_1.validateAutomaticRole)(member.guild, welcomeConfig.roleId);
                        if (!member.roles.cache.has(autoRole.id))
                            await member.roles.add(autoRole);
                    }
                    catch (err) {
                        logger_1.logger.warn({ errorType: err instanceof Error ? err.name : 'UnknownError', guildId, roleId: welcomeConfig.roleId }, 'Failed to assign auto-role on join');
                    }
                }
                if (welcomeConfig?.enabled && member.joinedTimestamp) {
                    await automation_execution_service_1.AutomationExecutionService.enqueueWelcomeMemberEvent({
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
                        logger_1.logger.error({ guildId, userId: member.id, errorType }, 'Could not enqueue durable welcome delivery');
                        await audit_service_1.AuditService.logEvent(member.guild, 'WELCOME_DELIVERY_ENQUEUE', member.id, member.id, JSON.stringify({ outcome: 'FAILURE', errorType }), 'FAILURE').catch(() => { });
                    });
                }
            }
            // 5. Log audit event (guild-scoped)
            await audit_service_1.AuditService.logEvent(member.guild, 'MEMBER_JOIN', member.id, member.id, `Member joined ${member.guild.name}`);
        }
        catch (error) {
            logger_1.logger.error({ err: error, discordId: member.id, guildId }, 'Error in OnboardingService.handleMemberAdd');
        }
    }
    /**
     * Processes a member leaving a guild.
     */
    static async handleMemberRemove(member) {
        const guildId = member.guild.id;
        logger_1.logger.info({ discordId: member.id, guildId, tag: member.user.tag }, 'Member left guild');
        try {
            const guildData = await guild_repository_1.GuildRepository.findById(guildId);
            if (!guildData)
                return;
            if (await guild_repository_1.GuildRepository.isModuleEnabled(guildId, 'welcome')) {
                const welcomeConfig = guildData.welcomeConfig;
                if (welcomeConfig?.enabled && welcomeConfig.leaveChannelId && member.joinedTimestamp) {
                    await automation_execution_service_1.AutomationExecutionService.enqueueWelcomeMemberEvent({
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
                        logger_1.logger.error({ guildId, userId: member.id, errorType }, 'Could not enqueue durable goodbye delivery');
                        await audit_service_1.AuditService.logEvent(member.guild, 'GOODBYE_DELIVERY_ENQUEUE', member.id, member.id, JSON.stringify({ outcome: 'FAILURE', errorType }), 'FAILURE').catch(() => { });
                    });
                }
            }
            if (member.joinedTimestamp) {
                await automation_execution_service_1.AutomationExecutionService.enqueueMemberEvent({
                    guildId,
                    eventType: 'MEMBER_LEAVE',
                    eventId: `${member.id}:${member.joinedTimestamp}`,
                    userId: member.id,
                    username: member.user.username,
                    displayName: member.displayName,
                    serverName: member.guild.name,
                    memberCount: member.guild.memberCount,
                }).catch((error) => logger_1.logger.error({ guildId, userId: member.id, errorType: error instanceof Error ? error.name : 'UnknownError' }, 'Could not enqueue member-leave automations'));
            }
            await audit_service_1.AuditService.logEvent(member.guild, 'MEMBER_LEAVE', member.id, member.id, `Member left ${member.guild.name}`);
        }
        catch (error) {
            logger_1.logger.error({ err: error, discordId: member.id, guildId }, 'Error in OnboardingService.handleMemberRemove');
        }
    }
}
exports.OnboardingService = OnboardingService;
