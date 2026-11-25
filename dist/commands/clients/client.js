"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const client_service_1 = require("../../services/client.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('client')
        .setDescription('Client relations & directory manager (Management Only)')
        .addSubcommand(sub => sub
        .setName('add')
        .setDescription('Register a client profile')
        .addStringOption(opt => opt.setName('name').setDescription('Primary contact name').setRequired(true))
        .addStringOption(opt => opt.setName('company').setDescription('Company or organization name').setRequired(true))
        .addStringOption(opt => opt.setName('email').setDescription('Contact email address').setRequired(false))
        .addStringOption(opt => opt
        .setName('division')
        .setDescription('Servicing division')
        .setChoices({ name: 'KRAXXSEC', value: 'KRAXXSEC' }, { name: 'KRAXX STUDIO', value: 'KRAXX_STUDIO' }, { name: 'Both', value: 'BOTH' }))
        .addStringOption(opt => opt.setName('notes').setDescription('Account notes').setRequired(false)))
        .addSubcommand(sub => sub.setName('list').setDescription('List registered clients directory')),
    async execute(interaction) {
        const member = interaction.member;
        const auth = permissions_service_1.PermissionsService.requireManagement(member);
        if (!auth.authorized) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
                ephemeral: true,
            });
            return;
        }
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'add') {
            await client_service_1.ClientService.addClient(interaction);
        }
        else if (subcommand === 'list') {
            await client_service_1.ClientService.listClients(interaction);
        }
    },
};
