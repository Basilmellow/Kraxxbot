"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const project_service_1 = require("../../services/project.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('project')
        .setDescription('Division project management directory')
        .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Register a new project')
        .addStringOption(opt => opt.setName('code').setDescription('Unique project code (e.g. SEC-01)').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Project title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Project summary').setRequired(true))
        .addStringOption(opt => opt
        .setName('department')
        .setDescription('Responsible division')
        .setChoices({ name: 'KRAXXSEC', value: 'KRAXXSEC' }, { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }))
        .addStringOption(opt => opt.setName('client').setDescription('Client company name').setRequired(false)))
        .addSubcommand(sub => sub.setName('list').setDescription('List active organization projects')),
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
            await project_service_1.ProjectService.createProject(interaction);
        }
        else if (subcommand === 'list') {
            await project_service_1.ProjectService.listProjects(interaction);
        }
    },
};
