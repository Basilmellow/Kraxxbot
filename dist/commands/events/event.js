"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const event_service_1 = require("../../services/event.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('event')
        .setDescription('Organizational event management')
        .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Schedule an event')
        .addStringOption(opt => opt.setName('title').setDescription('Event title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Event description').setRequired(true))
        .addIntegerOption(opt => opt.setName('in_hours').setDescription('Hours from now when event begins').setRequired(true))
        .addStringOption(opt => opt
        .setName('department')
        .setDescription('Division target')
        .setChoices({ name: 'General HQ', value: 'GENERAL' }, { name: 'KRAXXSEC', value: 'KRAXXSEC' }, { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }))
        .addStringOption(opt => opt
        .setName('type')
        .setDescription('Event type')
        .setChoices({ name: 'Internal', value: 'INTERNAL' }, { name: 'Public Workshop', value: 'PUBLIC' }, { name: 'Security CTF', value: 'SECURITY_CTF' })))
        .addSubcommand(sub => sub.setName('list').setDescription('List upcoming organizational events')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'create') {
            const member = interaction.member;
            const auth = permissions_service_1.PermissionsService.requireTeamLead(member);
            if (!auth.authorized) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
                    ephemeral: true,
                });
                return;
            }
            await event_service_1.EventService.createEvent(interaction);
        }
        else if (subcommand === 'list') {
            await event_service_1.EventService.listEvents(interaction);
        }
    },
};
