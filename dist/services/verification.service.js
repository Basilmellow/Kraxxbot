"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationService = void 0;
const member_repository_1 = require("../database/repositories/member.repository");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const automatic_role_1 = require("../security/automatic-role");
const logger_1 = require("../utils/logger");
const audit_service_1 = require("./audit.service");
const guild_repository_1 = require("../database/repositories/guild.repository");
const discord_transport_1 = require("./discord-transport");
class VerificationService {
    /**
     * Handles member verification idempotently from a button interaction or slash command.
     */
    static async processVerification(interaction) {
        const member = interaction.member;
        const guild = interaction.guild;
        if (!member || !guild || member.guild.id !== guild.id || member.user.id !== member.id) {
            const errorEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Verification Failed', 'Could not resolve server or member context.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }
        try {
            if (!(await guild_repository_1.GuildRepository.isModuleEnabled(guild.id, 'welcome'))) {
                await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Verification Unavailable', 'Verification is disabled for this server.')], ephemeral: true });
                return;
            }
            // 1. Ensure member entry exists in database
            const dbMember = await member_repository_1.MemberRepository.upsertMember({
                guildId: guild.id,
                discordId: member.id,
                username: member.user.username,
                displayName: member.displayName,
                avatar: member.user.avatarURL(),
            });
            // 2. Check idempotent verification status
            if (dbMember.isVerified) {
                await member_repository_1.MemberRepository.logVerificationAttempt(guild.id, member.id, 'ALREADY_VERIFIED', 'User clicked verify when already verified');
                const alreadyEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Already Verified', `Your membership in **${guild.name}** is already verified.`);
                await interaction.reply({ embeds: [alreadyEmbed], ephemeral: true });
                return;
            }
            // 3. Assign the configured role first. A failed Discord mutation must not leave a
            // verified database record that prevents a safe retry.
            const welcomeConfig = await (await Promise.resolve().then(() => __importStar(require('../database/client')))).prisma.welcomeConfig.findUnique({
                where: { guildId: guild.id },
            });
            const targetRoleId = welcomeConfig?.roleId;
            if (targetRoleId) {
                const role = await (0, automatic_role_1.validateAutomaticRole)(guild, targetRoleId);
                if (!member.roles.cache.has(role.id)) {
                    const token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
                    if (!token)
                        throw new Error('DISCORD_NOT_CONFIGURED');
                    await (0, discord_transport_1.discordRequest)(`https://discord.com/api/v10/guilds/${guild.id}/members/${member.id}/roles/${role.id}`, {
                        method: 'PUT',
                        headers: { Authorization: `Bot ${token}`, 'X-Audit-Log-Reason': encodeURIComponent('Member verification') },
                    });
                }
            }
            // 4. Persist verified state, verification attempt, and canonical audit atomically.
            await member_repository_1.MemberRepository.markVerified(guild.id, member.id);
            // 5. Send clean ephemeral response
            const successEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Verification Complete', `Your membership has been successfully verified. Welcome to **${guild.name}**!`);
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
            // 6. Log audit event
            await audit_service_1.AuditService.logEvent(guild, 'MEMBER_VERIFIED', member.id, member.id, `Member ${member.user.tag} completed verification in ${guild.name}.`, 'SUCCESS', false).catch((notifyError) => logger_1.logger.warn({ errorType: notifyError instanceof Error ? notifyError.name : 'UnknownError', guildId: guild.id }, 'Could not notify the configured audit channel'));
        }
        catch (error) {
            const errorCode = error instanceof discord_transport_1.DiscordApiError ? `DISCORD_${error.status}` : 'VERIFICATION_FAILED';
            logger_1.logger.error({ errorCode, discordId: member.id, guildId: guild.id }, 'Verification process encountered an exception');
            await member_repository_1.MemberRepository.logVerificationAttempt(guild.id, member.id, 'FAILED', errorCode).catch(() => { });
            const errorEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Verification Error', 'An error occurred while processing your verification. Please try again or contact server staff.');
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            }
            else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
}
exports.VerificationService = VerificationService;
