import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ReminderService } from '../../services/reminder.service';

export default {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Personal & operational reminders manager')
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Schedule a reminder notification')
        .addStringOption(opt => opt.setName('title').setDescription('Reminder title').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true))
        .addIntegerOption(opt => opt.setName('minutes').setDescription('Minutes from now to remind').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List your active reminders')),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      await ReminderService.setReminder(interaction);
    } else if (subcommand === 'list') {
      await ReminderService.listReminders(interaction);
    }
  },
};
