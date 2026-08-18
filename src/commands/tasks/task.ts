import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TaskService } from '../../services/task.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('task')
    .setDescription('Operational task management system')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a new operational task')
        .addStringOption(opt => opt.setName('title').setDescription('Task title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Task description').setRequired(true))
        .addUserOption(opt => opt.setName('assignee').setDescription('Assigned team member').setRequired(false))
        .addStringOption(opt =>
          opt
            .setName('department')
            .setDescription('Department assignment')
            .setChoices(
              { name: 'General', value: 'GENERAL' },
              { name: 'KRAXXSEC', value: 'KRAXXSEC' },
              { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('priority')
            .setDescription('Task priority tier')
            .setChoices(
              { name: 'Low', value: 'LOW' },
              { name: 'Medium', value: 'MEDIUM' },
              { name: 'High', value: 'HIGH' },
              { name: 'Urgent', value: 'URGENT' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List operational tasks')
        .addStringOption(opt =>
          opt
            .setName('department')
            .setDescription('Filter by department')
            .setChoices(
              { name: 'KRAXXSEC', value: 'KRAXXSEC' },
              { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('status')
            .setDescription('Filter by status')
            .setChoices(
              { name: 'Pending', value: 'PENDING' },
              { name: 'In Progress', value: 'IN_PROGRESS' },
              { name: 'Completed', value: 'COMPLETED' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Update status of a task')
        .addIntegerOption(opt => opt.setName('number').setDescription('Task number').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('status')
            .setDescription('New status')
            .setRequired(true)
            .setChoices(
              { name: 'Pending', value: 'PENDING' },
              { name: 'In Progress', value: 'IN_PROGRESS' },
              { name: 'Completed', value: 'COMPLETED' },
              { name: 'Cancelled', value: 'CANCELLED' }
            )
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const member = interaction.member as any;
      const auth = PermissionsService.requireTeamLead(member);
      if (!auth.authorized) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
          ephemeral: true,
        });
        return;
      }
      await TaskService.createTask(interaction);
    } else if (subcommand === 'list') {
      await TaskService.listTasks(interaction);
    } else if (subcommand === 'status') {
      await TaskService.updateTaskStatus(interaction);
    }
  },
};
