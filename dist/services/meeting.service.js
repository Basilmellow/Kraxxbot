"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingService = void 0;
const meeting_repository_1 = require("../database/repositories/meeting.repository");
const audit_service_1 = require("./audit.service");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
class MeetingService {
    static async scheduleMeeting(interaction) {
        const organizer = interaction.member;
        const title = interaction.options.getString('title', true);
        const agenda = interaction.options.getString('agenda', true);
        const department = interaction.options.getString('department') || 'GENERAL';
        const minutesFromNow = interaction.options.getInteger('in_minutes', true);
        const startTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
        try {
            const meeting = await meeting_repository_1.MeetingRepository.create({
                guildId: interaction.guildId,
                title,
                agenda,
                department,
                startTime,
                organizerId: organizer.id,
                locationChannelId: interaction.channelId,
            });
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.meeting(meeting.title, meeting.agenda, meeting.department, `<t:${Math.floor(startTime.getTime() / 1000)}:F> (<t:${Math.floor(startTime.getTime() / 1000)}:R>)`, `<@${organizer.id}>`, `<#${interaction.channelId}>`);
            await interaction.reply({ embeds: [embed] });
            await audit_service_1.AuditService.logEvent(interaction.guild, 'MEETING_SCHEDULED', organizer.id, meeting.id, `Meeting: ${title} scheduled for ${startTime.toISOString()}`);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to schedule meeting');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Meeting Error', 'Failed to schedule meeting.')],
                ephemeral: true,
            });
        }
    }
    static async listMeetings(interaction) {
        try {
            const upcoming = await meeting_repository_1.MeetingRepository.listUpcomingByGuild(interaction.guildId);
            if (upcoming.length === 0) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Meetings Schedule', 'No upcoming meetings currently scheduled.')],
                    ephemeral: true,
                });
                return;
            }
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('UPCOMING INTERNAL MEETINGS', 'HQ OPERATIONS');
            embed.setDescription(upcoming
                .map((m) => `• **${m.title}** (\`${m.department}\`)\n  <t:${Math.floor(m.startTime.getTime() / 1000)}:F> | Organizer: <@${m.organizerId}>\n  Agenda: ${m.agenda}`)
                .join('\n\n'));
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to list meetings');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Meeting Error', 'Failed to retrieve meetings.')],
                ephemeral: true,
            });
        }
    }
}
exports.MeetingService = MeetingService;
