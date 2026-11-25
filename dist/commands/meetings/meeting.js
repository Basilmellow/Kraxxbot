"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const meeting_service_1 = require("../../services/meeting.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('meeting')
        .setDescription('Schedule and manage internal meetings')
        .addSubcommand(sub => sub
        .setName('schedule')
        .setDescription('Schedule a new internal meeting')
        .addStringOption(opt => opt.setName('title').setDescription('Meeting title').setRequired(true))
        .addStringOption(opt => opt.setName('agenda').setDescription('Meeting agenda details').setRequired(true))
        .addIntegerOption(opt => opt.setName('in_minutes').setDescription('Minutes from now when meeting starts').setRequired(true))
        .addStringOption(opt => opt
        .setName('department')
        .setDescription('Division target')
        .setChoices({ name: 'General HQ', value: 'GENERAL' }, { name: 'KRAXXSEC', value: 'KRAXXSEC' }, { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' })))
        .addSubcommand(sub => sub.setName('list').setDescription('List upcoming scheduled meetings')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'schedule') {
            const member = interaction.member;
            const auth = permissions_service_1.PermissionsService.requireTeamLead(member);
            if (!auth.authorized) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
                    ephemeral: true,
                });
                return;
            }
            await meeting_service_1.MeetingService.scheduleMeeting(interaction);
        }
        else if (subcommand === 'list') {
            await meeting_service_1.MeetingService.listMeetings(interaction);
        }
    },
};
