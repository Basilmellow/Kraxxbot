"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const task_service_1 = require("../../services/task.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('task')
        .setDescription('Operational task management system')
        .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Create a new operational task')
        .addStringOption(opt => opt.setName('title').setDescription('Task title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Task description').setRequired(true))
        .addUserOption(opt => opt.setName('assignee').setDescription('Assigned team member').setRequired(false))
        .addStringOption(opt => opt
        .setName('department')
        .setDescription('Department assignment')
        .setChoices({ name: 'General', value: 'GENERAL' }, { name: 'KRAXXSEC', value: 'KRAXXSEC' }, { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }))
        .addStringOption(opt => opt
        .setName('priority')
        .setDescription('Task priority tier')
        .setChoices({ name: 'Low', value: 'LOW' }, { name: 'Medium', value: 'MEDIUM' }, { name: 'High', value: 'HIGH' }, { name: 'Urgent', value: 'URGENT' })))
        .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List operational tasks')
        .addStringOption(opt => opt
        .setName('department')
        .setDescription('Filter by department')
        .setChoices({ name: 'KRAXXSEC', value: 'KRAXXSEC' }, { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }))
        .addStringOption(opt => opt
        .setName('status')
        .setDescription('Filter by status')
        .setChoices({ name: 'Pending', value: 'PENDING' }, { name: 'In Progress', value: 'IN_PROGRESS' }, { name: 'Completed', value: 'COMPLETED' })))
        .addSubcommand(sub => sub
        .setName('status')
        .setDescription('Update status of a task')
        .addIntegerOption(opt => opt.setName('number').setDescription('Task number').setRequired(true))
        .addStringOption(opt => opt
        .setName('status')
        .setDescription('New status')
        .setRequired(true)
        .setChoices({ name: 'Pending', value: 'PENDING' }, { name: 'In Progress', value: 'IN_PROGRESS' }, { name: 'Completed', value: 'COMPLETED' }, { name: 'Cancelled', value: 'CANCELLED' }))),
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
            await task_service_1.TaskService.createTask(interaction);
        }
        else if (subcommand === 'list') {
            await task_service_1.TaskService.listTasks(interaction);
        }
        else if (subcommand === 'status') {
            await task_service_1.TaskService.updateTaskStatus(interaction);
        }
    },
};
