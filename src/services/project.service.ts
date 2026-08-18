import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { ProjectRepository } from '../database/repositories/project.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class ProjectService {
  static async createProject(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const code = interaction.options.getString('code', true).toUpperCase();
    const name = interaction.options.getString('name', true);
    const description = interaction.options.getString('description', true);
    const department = interaction.options.getString('department') || 'KRAXXSEC';
    const clientName = interaction.options.getString('client') || undefined;

    try {
      const existing = await ProjectRepository.findByCode(code);
      if (existing) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.error('Duplicate Code', `Project code \`${code}\` is already registered.`)],
          ephemeral: true,
        });
        return;
      }

      const project = await ProjectRepository.create({
        code,
        name,
        description,
        department,
        clientName,
        leadId: member.id,
      });

      const embed = KraxxEmbedBuilder.createHeader(`PROJECT [${project.code}]`, project.department);
      embed.setDescription(`### ${project.name}\n${project.description}`);
      embed.addFields(
        { name: 'Project Code', value: `\`${project.code}\``, inline: true },
        { name: 'Division', value: `\`${project.department}\``, inline: true },
        { name: 'Status', value: `\`${project.status}\``, inline: true },
        { name: 'Lead', value: `<@${member.id}>`, inline: true },
        { name: 'Client', value: project.clientName || 'Internal', inline: true }
      );

      await interaction.reply({ embeds: [embed] });

      await AuditService.logEvent(
        interaction.guild,
        'PROJECT_CREATE',
        member.id,
        project.id,
        `Project [${code}] ${name} created`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to create project');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Project Error', 'Failed to register project.')],
        ephemeral: true,
      });
    }
  }

  static async listProjects(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const projects = await ProjectRepository.listAll();

      if (projects.length === 0) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.success('Projects Directory', 'No active projects currently registered.')],
          ephemeral: true,
        });
        return;
      }

      const embed = KraxxEmbedBuilder.createHeader('KRAXX ACTIVE PROJECTS DIRECTORY', 'OPERATIONS');
      embed.setDescription(
        projects
          .map(
            p =>
              `• **[${p.code}] ${p.name}** | \`[${p.department}]\` | Status: \`${p.status}\`\n  ${p.description}`
          )
          .join('\n\n')
      );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Failed to list projects');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Project Error', 'Failed to retrieve project directory.')],
        ephemeral: true,
      });
    }
  }
}
