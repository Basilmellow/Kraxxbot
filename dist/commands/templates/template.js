"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const template_service_1 = require("../../services/template.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('template')
        .setDescription('Operational document & message templates')
        .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Save a new operational template')
        .addStringOption(opt => opt.setName('name').setDescription('Unique template identifier key').setRequired(true))
        .addStringOption(opt => opt
        .setName('category')
        .setDescription('Template category')
        .setRequired(true)
        .setChoices({ name: 'Announcement', value: 'ANNOUNCEMENT' }, { name: 'Security Report', value: 'SECURITY_REPORT' }, { name: 'Studio Brief', value: 'STUDIO_BRIEF' }, { name: 'Meeting Agenda', value: 'MEETING_AGENDA' }))
        .addStringOption(opt => opt.setName('title').setDescription('Template header title').setRequired(true))
        .addStringOption(opt => opt.setName('content').setDescription('Template markdown body content').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List registered operational templates'))
        .addSubcommand(sub => sub
        .setName('use')
        .setDescription('Render and display a saved template')
        .addStringOption(opt => opt.setName('name').setDescription('Template key name').setRequired(true))),
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
            await template_service_1.TemplateService.createTemplate(interaction);
        }
        else if (subcommand === 'list') {
            await template_service_1.TemplateService.listTemplates(interaction);
        }
        else if (subcommand === 'use') {
            await template_service_1.TemplateService.useTemplate(interaction);
        }
    },
};
