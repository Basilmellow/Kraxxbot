"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const template_repository_1 = require("../database/repositories/template.repository");
const audit_service_1 = require("./audit.service");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
class TemplateService {
    static async createTemplate(interaction) {
        const member = interaction.member;
        const guildId = interaction.guildId;
        const name = interaction.options.getString('name', true).toLowerCase();
        const category = interaction.options.getString('category', true);
        const title = interaction.options.getString('title', true);
        const content = interaction.options.getString('content', true);
        // Store content as a simple JSON embedData object
        const embedData = JSON.stringify({ title, description: content });
        try {
            const template = await template_repository_1.TemplateRepository.create({
                guildId,
                name,
                category,
                title,
                description: content,
                embedData,
                createdBy: member.id,
            });
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Template Saved', `Template **"${template.name}"** (\`${template.category}\`) registered.`);
            await interaction.reply({ embeds: [embed], ephemeral: true });
            await audit_service_1.AuditService.logEvent(interaction.guild, 'TEMPLATE_CREATE', member.id, template.id, `Created template: ${template.name}`);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to create template');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Template Error', 'Failed to register template.')],
                ephemeral: true,
            });
        }
    }
    static async listTemplates(interaction) {
        const guildId = interaction.guildId;
        try {
            const templates = await template_repository_1.TemplateRepository.listByGuild(guildId);
            if (templates.length === 0) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Templates', 'No standardized templates registered.')],
                    ephemeral: true,
                });
                return;
            }
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('STANDARDIZED TEMPLATES', 'OPERATIONS');
            embed.setDescription(templates
                .map((t) => `• **${t.name}** [\`${t.category}\`]: *${t.title || 'No title'}*`)
                .join('\n'));
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to list templates');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Template Error', 'Failed to retrieve templates.')],
                ephemeral: true,
            });
        }
    }
    static async useTemplate(interaction) {
        const guildId = interaction.guildId;
        const name = interaction.options.getString('name', true).toLowerCase();
        try {
            const template = await template_repository_1.TemplateRepository.findByName(guildId, name);
            if (!template) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Not Found', `Template \`${name}\` not found.`)],
                    ephemeral: true,
                });
                return;
            }
            // Parse embedData to get content
            let parsedContent = template.description || 'No content available.';
            try {
                const parsed = JSON.parse(template.embedData);
                if (parsed.description)
                    parsedContent = parsed.description;
            }
            catch {
                // Use description fallback
            }
            const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader(template.title || template.name, template.category);
            embed.setDescription(parsedContent);
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Failed to render template');
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Template Error', 'Failed to render template.')],
                ephemeral: true,
            });
        }
    }
}
exports.TemplateService = TemplateService;
