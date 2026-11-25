"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const channels_1 = require("../../config/channels");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
const client_1 = require("../../database/client");
function safeString(val, fallback = 'N/A') {
    if (val === undefined || val === null)
        return fallback;
    const str = String(val).trim();
    return str.length > 0 ? str : fallback;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('config')
        .setDescription('System diagnostic & configuration inspection')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('check').setDescription('Display configured Discord roles and channels status')),
    async execute(interaction) {
        const member = interaction.member;
        const auth = permissions_service_1.PermissionsService.requireManagement(member);
        if (!auth.authorized) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
                ephemeral: true,
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'check') {
            const guildId = interaction.guildId;
            // 1. Database Connectivity Check
            let dbStatus = 'DISCONNECTED';
            try {
                await client_1.prisma.$queryRaw `SELECT 1`;
                dbStatus = 'CONNECTED';
            }
            catch {
                dbStatus = 'DISCONNECTED';
            }
            // 2. Discord & Guild Status
            const discordStatus = interaction.client.user ? 'CONNECTED' : 'DISCONNECTED';
            const guildName = interaction.guild?.name ? safeString(interaction.guild.name) : 'DM / NO_GUILD';
            const guildStatus = interaction.guild ? `CONNECTED (${guildName})` : 'NOT_IN_GUILD';
            // 3. Guild Settings from DB
            let settingsStatus = 'NOT CONFIGURED';
            let rolesSummary = 'N/A';
            let channelsSummary = 'N/A';
            try {
                const guildSettings = await client_1.prisma.guildSettings.findUnique({ where: { guildId } });
                if (guildSettings) {
                    settingsStatus = guildSettings.setupCompleted ? 'SETUP COMPLETE' : 'SETUP INCOMPLETE';
                    const configuredRoles = [
                        guildSettings.adminRoleId,
                        guildSettings.modRoleId,
                        guildSettings.supportRoleId,
                        guildSettings.staffRoleId,
                    ].filter(Boolean).length;
                    rolesSummary = `${configuredRoles}/4 roles configured`;
                    const configuredChannels = [
                        guildSettings.logChannelId,
                        guildSettings.modLogChannelId,
                        guildSettings.welcomeChannelId,
                        guildSettings.announcementChannelId,
                        guildSettings.ticketLogsChannelId,
                    ].filter(Boolean).length;
                    channelsSummary = `${configuredChannels}/5 channels configured`;
                }
            }
            catch (err) {
                settingsStatus = 'DB_ERROR';
            }
            // 4. Channels diagnostic (keys only, no env vars)
            const channelDiag = (0, channels_1.getChannelDiagnostics)();
            // 5. Build Embed
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('DIAGNOSTIC OVERVIEW', 'CONFIGURATION');
            embed.addFields({
                name: 'SYSTEM',
                value: `Database: \`${safeString(dbStatus)}\`\nDiscord: \`${safeString(discordStatus)}\`\nGuild: \`${safeString(guildStatus)}\``,
                inline: true,
            }, {
                name: 'GUILD SETTINGS',
                value: `Status: \`${settingsStatus}\`\nRoles: \`${rolesSummary}\`\nChannels: \`${channelsSummary}\``,
                inline: true,
            }, {
                name: 'CHANNEL KEYS',
                value: channelDiag.map(c => `• \`${c.key}\``).join('\n'),
                inline: false,
            });
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
