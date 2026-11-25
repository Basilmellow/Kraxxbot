"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const reminder_service_1 = require("../../services/reminder.service");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('remind')
        .setDescription('Personal & operational reminders manager')
        .addSubcommand(sub => sub
        .setName('set')
        .setDescription('Schedule a reminder notification')
        .addStringOption(opt => opt.setName('title').setDescription('Reminder title').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true))
        .addIntegerOption(opt => opt.setName('minutes').setDescription('Minutes from now to remind').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List your active reminders')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'set') {
            await reminder_service_1.ReminderService.setReminder(interaction);
        }
        else if (subcommand === 'list') {
            await reminder_service_1.ReminderService.listReminders(interaction);
        }
    },
};
