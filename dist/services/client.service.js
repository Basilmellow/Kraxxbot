"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const audit_service_1 = require("./audit.service");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
// NOTE: Client management is not yet backed by a Prisma model.
// These handlers return a "not yet implemented" response.
class ClientService {
    static async addClient(interaction) {
        const member = interaction.member;
        const name = interaction.options.getString('name', true);
        const company = interaction.options.getString('company', true);
        const division = interaction.options.getString('division') || 'GENERAL';
        logger_1.logger.warn({ executor: member.id, name, company, division }, 'Client model not yet in schema — addClient is a no-op');
        await audit_service_1.AuditService.logEvent(interaction.guild, 'CLIENT_ADD_ATTEMPT', member.id, interaction.guildId || 'unknown', `Attempted to add client: ${company} (${name})`);
        await interaction.reply({
            embeds: [
                kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Feature Unavailable', 'Client management is not yet available. This feature will be enabled in a future update.'),
            ],
            ephemeral: true,
        });
    }
    static async listClients(interaction) {
        await interaction.reply({
            embeds: [
                kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Feature Unavailable', 'Client management is not yet available. This feature will be enabled in a future update.'),
            ],
            ephemeral: true,
        });
    }
}
exports.ClientService = ClientService;
