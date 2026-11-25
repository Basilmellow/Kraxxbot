"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_1 = require("../../database/client");
const moderation_contract_1 = require("../../services/moderation-contract");
const moderation_discord_1 = require("../../services/moderation-discord");
const moderation_service_1 = require("../../services/moderation.service");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('moderate')
        .setDescription('Record and execute an authorized moderation action')
        .setDMPermission(false)
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o
        .setName('action')
        .setDescription('LOCK controls @everyone Send Messages only')
        .setRequired(true)
        .addChoices(...moderation_contract_1.MODERATION_ACTIONS.map(a => ({ name: a.toLowerCase(), value: a }))))
        .addStringOption(o => o
        .setName('target')
        .setDescription('Member ID, or channel ID for channel actions')
        .setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason saved in case history').setMaxLength(400))
        .addIntegerOption(o => o
        .setName('seconds')
        .setDescription('Timeout / slowmode seconds; zero removes the setting')
        .setMinValue(0)
        .setMaxValue(2419200))
        .addIntegerOption(o => o
        .setName('count')
        .setDescription('PURGE: inspect last 1–100 messages; skip pinned/old messages')
        .setMinValue(1)
        .setMaxValue(100))
        .addIntegerOption(o => o
        .setName('case')
        .setDescription('ESCALATE: active WARN or TIMEOUT case number')
        .setMinValue(1))
        .addStringOption(o => o
        .setName('evidence')
        .setDescription('Discord message links, separated by spaces')
        .setMaxLength(1500)),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'Use this command in a server.', ephemeral: true });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        try {
            const record = await (0, moderation_service_1.runModeration)(client_1.prisma, (0, moderation_discord_1.createModerationAdapter)(process.env.DISCORD_TOKEN || ''), {
                guildId: interaction.guildId,
                requestKey: interaction.id,
                targetId: interaction.options.getString('target', true),
                action: interaction.options.getString('action', true),
                reason: interaction.options.getString('reason') ?? undefined,
                durationSeconds: interaction.options.getInteger('seconds') ?? undefined,
                count: interaction.options.getInteger('count') ?? undefined,
                sourceCaseNumber: interaction.options.getInteger('case') ?? undefined,
                evidence: interaction.options.getString('evidence')?.trim().split(/\s+/),
            }, interaction.user.id, 'BOT');
            await interaction.editReply({
                content: `Case #${record.caseNumber}: ${record.action} — ${record.status}${record.errorCode ? ` (${record.errorCode})` : ''}.${record.status === 'UNKNOWN' || record.status === 'PENDING' ? ' Verify Discord state before another attempt.' : ''}`,
                allowedMentions: { parse: [] },
            });
        }
        catch (error) {
            await interaction.editReply({
                content: `Moderation not confirmed: ${(0, moderation_service_1.moderationFailureCode)(error)}. Verify case history before retrying.`,
                allowedMentions: { parse: [] },
            });
        }
    },
};
