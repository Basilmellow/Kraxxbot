"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const audit_service_1 = require("./audit.service");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
// NOTE: Project management is not yet backed by a Prisma model.
// These handlers return a "not yet implemented" response.
class ProjectService {
    static async createProject(interaction) {
        const member = interaction.member;
        const code = interaction.options.getString('code', true).toUpperCase();
        const name = interaction.options.getString('name', true);
        logger_1.logger.warn({ executor: member.id, code, name }, 'Project model not yet in schema — createProject is a no-op');
        await audit_service_1.AuditService.logEvent(interaction.guild, 'PROJECT_CREATE_ATTEMPT', member.id, interaction.guildId || 'unknown', `Attempted to create project: [${code}] ${name}`);
        await interaction.reply({
            embeds: [
                kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Feature Unavailable', 'Project management is not yet available. This feature will be enabled in a future update.'),
            ],
            ephemeral: true,
        });
    }
    static async listProjects(interaction) {
        await interaction.reply({
            embeds: [
                kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Feature Unavailable', 'Project management is not yet available. This feature will be enabled in a future update.'),
            ],
            ephemeral: true,
        });
    }
}
exports.ProjectService = ProjectService;
