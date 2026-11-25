"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventService = void 0;
const event_repository_1 = require("../database/repositories/event.repository");
const audit_service_1 = require("./audit.service");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
class EventService {
    static async createEvent(interaction) {
        const organizer = interaction.member;
        const guildId = interaction.guildId;
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);
        const type = interaction.options.getString('type') || 'INTERNAL';
        const department = interaction.options.getString('department') || 'GENERAL';
        const hoursFromNow = interaction.options.getInteger('in_hours', true);
        const startTime = new Date(Date.now() + hoursFromNow * 3600 * 1000);
        try {
            const event = await event_repository_1.EventRepository.create({
                guildId,
                title,
                description,
                type,
                department,
                startTime,
                organizerId: organizer.id,
            });
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.event(event.title, event.description, event.type, event.department, `<t:${Math.floor(startTime.getTime() / 1000)}:F> (<t:${Math.floor(startTime.getTime() / 1000)}:R>)`, 'Event');
            await interaction.reply({ embeds: [embed] });
            await audit_service_1.AuditService.logEvent(interaction.guild, 'EVENT_CREATE', organizer.id, event.id, `Event created: ${title} (${type})`);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to create event');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Event Error', 'Failed to schedule event.')],
                ephemeral: true,
            });
        }
    }
    static async listEvents(interaction) {
        const guildId = interaction.guildId;
        try {
            const events = await event_repository_1.EventRepository.listUpcomingByGuild(guildId);
            if (events.length === 0) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Events Calendar', 'No upcoming events scheduled.')],
                    ephemeral: true,
                });
                return;
            }
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('UPCOMING EVENTS', 'CALENDAR');
            embed.setDescription(events
                .map((e) => `• **${e.title}** [\`${e.type}\` / \`${e.department}\`]\n  Starts: <t:${Math.floor(e.startTime.getTime() / 1000)}:F>\n  ${e.description}`)
                .join('\n\n'));
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to list events');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Event Error', 'Failed to retrieve events.')],
                ephemeral: true,
            });
        }
    }
}
exports.EventService = EventService;
