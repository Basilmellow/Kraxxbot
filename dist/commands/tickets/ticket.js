"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const ticket_service_1 = require("../../services/ticket.service");
const permissions_service_1 = require("../../services/permissions.service");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Comprehensive support ticket system')
        // /ticket panel setup
        .addSubcommandGroup(group => group
        .setName('panel')
        .setDescription('Ticket panel management commands')
        .addSubcommand(sub => sub
        .setName('setup')
        .setDescription('Spawn a support ticket creation panel in a channel (Management Only)')
        .addChannelOption(opt => opt
        .setName('channel')
        .setDescription('Target text channel')
        .addChannelTypes(discord_js_1.ChannelType.GuildText)
        .setRequired(false))
        .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(false))
        .addStringOption(opt => opt.setName('description').setDescription('Panel main description').setRequired(false))
        .addStringOption(opt => opt.setName('category').setDescription('Support category (e.g. GENERAL, SECURITY)').setRequired(false)))
        .addSubcommand(sub => sub
        .setName('preset')
        .setDescription('Deploy complete multi-category support ticket panel with all category buttons')
        .addChannelOption(opt => opt
        .setName('channel')
        .setDescription('Target text channel')
        .addChannelTypes(discord_js_1.ChannelType.GuildText)
        .setRequired(false))
        .addStringOption(opt => opt.setName('banner_url').setDescription('Optional image banner URL').setRequired(false)))
        .addSubcommand(sub => sub.setName('list').setDescription('List active support ticket panels'))
        .addSubcommand(sub => sub
        .setName('delete')
        .setDescription('Delete a ticket panel by ID (Management Only)')
        .addStringOption(opt => opt.setName('panel_id').setDescription('Panel ID to delete').setRequired(true))))
        // /ticket claim
        .addSubcommand(sub => sub.setName('claim').setDescription('Claim responsibility for the current support ticket'))
        // /ticket unclaim
        .addSubcommand(sub => sub.setName('unclaim').setDescription('Unclaim responsibility for the current support ticket'))
        // /ticket close
        .addSubcommand(sub => sub
        .setName('close')
        .setDescription('Close the current support ticket')
        .addStringOption(opt => opt.setName('reason').setDescription('Optional closing reason').setRequired(false)))
        // /ticket reopen
        .addSubcommand(sub => sub.setName('reopen').setDescription('Reopen a closed support ticket'))
        // /ticket delete
        .addSubcommand(sub => sub.setName('delete').setDescription('Delete the current ticket channel and purge data'))
        // /ticket user add / remove
        .addSubcommand(sub => sub
        .setName('user')
        .setDescription('Add or remove a user to/from ticket channel permissions')
        .addStringOption(opt => opt
        .setName('action')
        .setDescription('Action to perform')
        .setRequired(true)
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
        // /ticket transcript
        .addSubcommand(sub => sub.setName('transcript').setDescription('Generate a message history transcript for the ticket')),
    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const member = interaction.member;
        // Enforce Ticket Manager authorization for all management commands
        const auth = permissions_service_1.PermissionsService.requireTicketManager(member);
        // Group: /ticket panel ...
        if (group === 'panel') {
            if (!auth.authorized) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'You do not have permission to manage tickets.')],
                    ephemeral: true,
                });
                return;
            }
            if (subcommand === 'list') {
                await ticket_service_1.TicketService.listTicketPanels(interaction);
                return;
            }
            if (subcommand === 'setup') {
                const targetChannel = interaction.options.getChannel('channel');
                const title = interaction.options.getString('title') || undefined;
                const description = interaction.options.getString('description') || undefined;
                const category = interaction.options.getString('category') || undefined;
                await ticket_service_1.TicketService.setupTicketPanel(interaction, targetChannel || undefined, title, description, category);
                return;
            }
            if (subcommand === 'preset') {
                const targetChannel = interaction.options.getChannel('channel');
                const bannerUrl = interaction.options.getString('banner_url') || undefined;
                await ticket_service_1.TicketService.setupMultiCategoryPanel(interaction, targetChannel || undefined, bannerUrl);
                return;
            }
            if (subcommand === 'delete') {
                const panelId = interaction.options.getString('panel_id', true);
                await ticket_service_1.TicketService.deleteTicketPanel(interaction, panelId);
                return;
            }
        }
        // Direct Subcommands: Require Ticket Manager authorization
        if (!auth.authorized) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', auth.reason || 'You do not have permission to manage tickets.')],
                ephemeral: true,
            });
            return;
        }
        if (subcommand === 'claim') {
            await ticket_service_1.TicketService.claimTicket(interaction);
            return;
        }
        if (subcommand === 'unclaim') {
            await ticket_service_1.TicketService.unclaimTicket(interaction);
            return;
        }
        if (subcommand === 'close') {
            const reason = interaction.options.getString('reason') || undefined;
            await ticket_service_1.TicketService.closeTicket(interaction, reason);
            return;
        }
        if (subcommand === 'reopen') {
            await ticket_service_1.TicketService.reopenTicket(interaction);
            return;
        }
        if (subcommand === 'delete') {
            await ticket_service_1.TicketService.deleteTicketChannel(interaction);
            return;
        }
        if (subcommand === 'user') {
            const action = interaction.options.getString('action', true);
            const targetUser = interaction.options.getUser('user', true);
            await ticket_service_1.TicketService.modifyTicketUser(interaction, targetUser, action);
            return;
        }
        if (subcommand === 'transcript') {
            await ticket_service_1.TicketService.generateTranscript(interaction);
            return;
        }
    },
};
