import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { TaskRepository } from '../database/repositories/task.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class TaskService {
  static async createTask(interaction: ChatInputCommandInteraction): Promise<void> {
    const creator = interaction.member as GuildMember;
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const department = interaction.options.getString('department') || 'GENERAL';
    const priority = interaction.options.getString('priority') || 'MEDIUM';
    const assignee = interaction.options.getUser('assignee');

    try {
      const task = await TaskRepository.create({
        title,
        description,
        department,
        priority,
        creatorId: creator.id,
        assigneeId: assignee ? assignee.id : undefined,
      });

      const embed = KraxxEmbedBuilder.task(
        task.taskNumber,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.department,
        assignee ? `<@${assignee.id}>` : 'Unassigned'
      );

      await interaction.reply({ embeds: [embed] });

      await AuditService.logEvent(
        interaction.guild,
        'TASK_CREATE',
        creator.id,
        task.id,
        `Created Task #${task.taskNumber}: ${title} (${department})`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to create task');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Task Error', 'Failed to create task record.')],
        ephemeral: true,
      });
    }
  }

  static async listTasks(interaction: ChatInputCommandInteraction): Promise<void> {
    const department = interaction.options.getString('department') || undefined;
    const status = interaction.options.getString('status') || undefined;

    try {
      const tasks = await TaskRepository.listByDepartment(department, status);

      if (tasks.length === 0) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.success('Tasks Overview', 'No active tasks found matching criteria.')],
          ephemeral: true,
        });
        return;
      }

      const embed = KraxxEmbedBuilder.createHeader('OPERATIONAL TASKS LIST', department || 'HQ ALL');
      embed.setDescription(
        tasks
          .slice(0, 15)
          .map(
            t =>
              `• **#${t.taskNumber}** | \`[${t.status}]\` | \`[${t.priority}]\` **${t.title}** (${t.assigneeId ? `<@${t.assigneeId}>` : 'Unassigned'})`
          )
          .join('\n')
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Failed to list tasks');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Task Error', 'Failed to retrieve tasks.')],
        ephemeral: true,
      });
    }
  }

  static async updateTaskStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    const taskNumber = interaction.options.getInteger('number', true);
    const status = interaction.options.getString('status', true);
    const member = interaction.member as GuildMember;

    try {
      const existing = await TaskRepository.findByTaskNumber(taskNumber);
      if (!existing) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.error('Not Found', `Task #${taskNumber} does not exist.`)],
          ephemeral: true,
        });
        return;
      }

      const updated = await TaskRepository.updateStatus(existing.id, status);

      const embed = KraxxEmbedBuilder.success(
        'Task Status Updated',
        `Task **#${taskNumber}** status changed to \`${updated.status}\`.`
      );
      await interaction.reply({ embeds: [embed] });

      await AuditService.logEvent(
        interaction.guild,
        'TASK_UPDATE',
        member.id,
        existing.id,
        `Task #${taskNumber} status -> ${status}`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to update task status');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Task Error', 'Failed to update task status.')],
        ephemeral: true,
      });
    }
  }
}
