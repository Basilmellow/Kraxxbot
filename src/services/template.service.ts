import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { TemplateRepository } from '../database/repositories/template.repository';
import { AuditService } from './audit.service';
import { KraxxEmbedBuilder } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class TemplateService {
  static async createTemplate(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    const name = interaction.options.getString('name', true).toLowerCase();
    const category = interaction.options.getString('category', true);
    const title = interaction.options.getString('title', true);
    const content = interaction.options.getString('content', true);

    try {
      const template = await TemplateRepository.create({
        name,
        category,
        title,
        content,
        createdBy: member.id,
      });

      const embed = KraxxEmbedBuilder.success(
        'Template Saved',
        `Template **"${template.name}"** (\`${template.category}\`) registered.`
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });

      await AuditService.logEvent(
        interaction.guild,
        'TEMPLATE_CREATE',
        member.id,
        template.id,
        `Created template: ${template.name}`
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to create template');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Template Error', 'Failed to register template.')],
        ephemeral: true,
      });
    }
  }

  static async listTemplates(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const templates = await TemplateRepository.listAll();

      if (templates.length === 0) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.success('Templates', 'No standardized templates registered.')],
          ephemeral: true,
        });
        return;
      }

      const embed = KraxxEmbedBuilder.createHeader('STANDARDIZED TEMPLATES', 'OPERATIONS');
      embed.setDescription(
        templates
          .map(t => `• **${t.name}** [\`${t.category}\`]: *${t.title}*`)
          .join('\n')
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      logger.error({ err: error }, 'Failed to list templates');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Template Error', 'Failed to retrieve templates.')],
        ephemeral: true,
      });
    }
  }

  static async useTemplate(interaction: ChatInputCommandInteraction): Promise<void> {
    const name = interaction.options.getString('name', true).toLowerCase();

    try {
      const template = await TemplateRepository.findByName(name);
      if (!template) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.error('Not Found', `Template \`${name}\` not found.`)],
          ephemeral: true,
        });
        return;
      }

      const embed = KraxxEmbedBuilder.createHeader(template.title, template.category);
      embed.setDescription(template.content);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error({ err: error }, 'Failed to render template');
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Template Error', 'Failed to render template.')],
        ephemeral: true,
      });
    }
  }
}
