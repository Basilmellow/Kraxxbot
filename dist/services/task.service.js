"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const task_repository_1 = require("../database/repositories/task.repository");
const audit_service_1 = require("./audit.service");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
class TaskService {
    static async createTask(interaction) {
        const creator = interaction.member;
        const guildId = interaction.guildId;
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);
        const department = interaction.options.getString('department') || 'GENERAL';
        const priority = interaction.options.getString('priority') || 'MEDIUM';
        const assignee = interaction.options.getUser('assignee');
        try {
            const task = await task_repository_1.TaskRepository.create({
                guildId,
                title,
                description,
                department,
                priority,
                creatorId: creator.id,
                assigneeId: assignee ? assignee.id : undefined,
            });
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.task(task.taskNumber, task.title, task.description, task.status, task.priority, task.department, assignee ? `<@${assignee.id}>` : 'Unassigned');
            await interaction.reply({ embeds: [embed] });
            await audit_service_1.AuditService.logEvent(interaction.guild, 'TASK_CREATE', creator.id, task.id, `Created Task #${task.taskNumber}: ${title} (${department})`);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to create task');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Task Error', 'Failed to create task record.')],
                ephemeral: true,
            });
        }
    }
    static async listTasks(interaction) {
        const guildId = interaction.guildId;
        const department = interaction.options.getString('department') || undefined;
        const status = interaction.options.getString('status') || undefined;
        try {
            const tasks = await task_repository_1.TaskRepository.listByGuild(guildId, { department, status });
            if (tasks.length === 0) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Tasks Overview', 'No active tasks found matching criteria.')],
                    ephemeral: true,
                });
                return;
            }
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('OPERATIONAL TASKS LIST', department || 'ALL');
            embed.setDescription(tasks
                .slice(0, 15)
                .map((t) => `• **#${t.taskNumber}** | \`[${t.status}]\` | \`[${t.priority}]\` **${t.title}** (${t.assigneeId ? `<@${t.assigneeId}>` : 'Unassigned'})`)
                .join('\n'));
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to list tasks');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Task Error', 'Failed to retrieve tasks.')],
                ephemeral: true,
            });
        }
    }
    static async updateTaskStatus(interaction) {
        const taskNumber = interaction.options.getInteger('number', true);
        const status = interaction.options.getString('status', true);
        const member = interaction.member;
        const guildId = interaction.guildId;
        try {
            const existing = await task_repository_1.TaskRepository.findByTaskNumber(guildId, taskNumber);
            if (!existing) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Not Found', `Task #${taskNumber} does not exist.`)],
                    ephemeral: true,
                });
                return;
            }
            const updated = await task_repository_1.TaskRepository.updateStatus(existing.id, status);
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Task Status Updated', `Task **#${taskNumber}** status changed to \`${updated.status}\`.`);
            await interaction.reply({ embeds: [embed] });
            await audit_service_1.AuditService.logEvent(interaction.guild, 'TASK_UPDATE', member.id, existing.id, `Task #${taskNumber} status -> ${status}`);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to update task status');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Task Error', 'Failed to update task status.')],
                ephemeral: true,
            });
        }
    }
}
exports.TaskService = TaskService;
