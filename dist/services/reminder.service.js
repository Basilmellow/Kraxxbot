"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const reminder_repository_1 = require("../database/repositories/reminder.repository");
const audit_service_1 = require("./audit.service");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
class ReminderService {
    static async setReminder(interaction) {
        const member = interaction.member;
        const guildId = interaction.guildId;
        const title = interaction.options.getString('title', true);
        const message = interaction.options.getString('message', true);
        const minutes = interaction.options.getInteger('minutes', true);
        const triggerAt = new Date(Date.now() + minutes * 60 * 1000);
        try {
            const reminder = await reminder_repository_1.ReminderRepository.create({
                guildId,
                title,
                message,
                targetType: 'USER',
                targetId: member.id,
                triggerAt,
                createdBy: member.id,
            });
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Reminder Scheduled', `Reminder **"${title}"** scheduled for <t:${Math.floor(triggerAt.getTime() / 1000)}:R>.`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
            await audit_service_1.AuditService.logEvent(interaction.guild, 'REMINDER_SET', member.id, reminder.id, `Reminder "${title}" set for ${minutes} mins`);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to set reminder');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Reminder Error', 'Failed to schedule reminder.')],
                ephemeral: true,
            });
        }
    }
    static async listReminders(interaction) {
        const member = interaction.member;
        const guildId = interaction.guildId;
        try {
            const reminders = await reminder_repository_1.ReminderRepository.listByGuildAndUser(guildId, member.id);
            if (reminders.length === 0) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Reminders', 'You have no active pending reminders.')],
                    ephemeral: true,
                });
                return;
            }
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('ACTIVE REMINDERS', 'PERSONAL');
            embed.setDescription(reminders
                .map((r) => `• **${r.title}**: ${r.message} (<t:${Math.floor((r.triggerAt?.getTime() || 0) / 1000)}:R>)`)
                .join('\n'));
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to list reminders');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Reminder Error', 'Failed to retrieve reminders.')],
                ephemeral: true,
            });
        }
    }
}
exports.ReminderService = ReminderService;
