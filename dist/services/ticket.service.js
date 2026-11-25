"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketService = exports.TICKET_CATEGORIES = void 0;
const discord_js_1 = require("discord.js");
const roles_1 = require("../config/roles");
const guild_repository_1 = require("../database/repositories/guild.repository");
const ticket_repository_1 = require("../database/repositories/ticket.repository");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
const audit_service_1 = require("./audit.service");
const ticket_domain_service_1 = require("./ticket-domain.service");
exports.TICKET_CATEGORIES = [
    // Row 1: Division & Services Support
    { key: 'kraxxsec', label: 'KRAXXSEC Support', emoji: '🛡️', description: 'Cybersecurity, security engineering & audit queries', style: discord_js_1.ButtonStyle.Primary },
    { key: 'studio', label: 'KRAXX STUDIO Support', emoji: '🎨', description: 'Creative, digital, media & web design services', style: discord_js_1.ButtonStyle.Primary },
    { key: 'operations', label: 'KRAXX Operations', emoji: '⚡', description: 'Parent organization operations & main HQ support', style: discord_js_1.ButtonStyle.Primary },
    { key: 'project', label: 'Client Project Inquiry', emoji: '💼', description: 'New project proposals, quotes & client onboarding', style: discord_js_1.ButtonStyle.Primary },
    { key: 'service_order', label: 'Service Request', emoji: '📑', description: 'Request specialized security or digital studio services', style: discord_js_1.ButtonStyle.Primary },
    // Row 2: Business & Contact
    { key: 'billing', label: 'Billing & Invoices', emoji: '💳', description: 'Help with client billing, invoices & payment queries', style: discord_js_1.ButtonStyle.Success },
    { key: 'collab', label: 'Partnership & Collab', emoji: '🤝', description: 'Business collaborations, sponsorships & media requests', style: discord_js_1.ButtonStyle.Success },
    { key: 'contact_exec', label: 'Executive Contact', emoji: '📩', description: 'Direct contact with KRAXX Management & Leadership', style: discord_js_1.ButtonStyle.Success },
    { key: 'personal', label: 'Personal Assistance', emoji: '🙋‍♂️', description: 'One-on-one help for confidential or account concerns', style: discord_js_1.ButtonStyle.Success },
    { key: 'general', label: 'General Support', emoji: '💬', description: 'General questions or basic server guidance', style: discord_js_1.ButtonStyle.Success },
    // Row 3: Technical & Safety
    { key: 'bugs', label: 'Bug & Tech Report', emoji: '🐞', description: 'Report bugs or technical issues in systems/bots', style: discord_js_1.ButtonStyle.Danger },
    { key: 'access', label: 'Access & Roles', emoji: '🔑', description: 'Role requests, verification, or channel access', style: discord_js_1.ButtonStyle.Danger },
    { key: 'infrastructure', label: 'Infrastructure & Hosting', emoji: '🌐', description: 'Server, cloud & network infrastructure assistance', style: discord_js_1.ButtonStyle.Danger },
    { key: 'feedback', label: 'Feedback & Ideas', emoji: '💡', description: 'Community suggestions & feature proposals', style: discord_js_1.ButtonStyle.Secondary },
    { key: 'emergency', label: 'Emergency Incident', emoji: '🚨', description: 'Urgent escalation or security incident reports', style: discord_js_1.ButtonStyle.Danger },
];
/** Permanent categories whitelist that must NEVER be deleted dynamically */
const PERMANENT_CATEGORIES_WHITELIST = [
    'ticket-transcripts',
    'ticket-logs',
    'kraxx hq',
    'kraxxsec',
    'kraxx studio',
    'clients',
    'management',
    'operations',
    'admin',
    'general',
    'onboarding',
];
class TicketService {
    /**
     * Helper to perform server-side permission check for ticket management actions.
     */
    static async verifyTicketManager(member) {
        if (!member?.guild?.id)
            return false;
        const guildData = await guild_repository_1.GuildRepository.findById(member.guild.id);
        return (await guild_repository_1.GuildRepository.isModuleEnabled(member.guild.id, 'tickets')) && (0, roles_1.isTicketManager)(member, guildData?.settings);
    }
    /**
     * Deploys a single panel or custom panel.
     */
    static async setupTicketPanel(interaction, targetChannel, title, description, category) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channel = (targetChannel || interaction.channel);
        if (!channel || channel.guildId !== interaction.guildId || channel.type !== discord_js_1.ChannelType.GuildText) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Invalid channel specified.')],
                ephemeral: true,
            });
            return;
        }
        const panelTitle = title || 'KRAXXBot │ SUPPORT TICKETS';
        const panelCategory = category || 'GENERAL';
        if (panelCategory !== 'GENERAL' && !exports.TICKET_CATEGORIES.some((item) => item.key === panelCategory)) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Category', 'Select a configured ticket category.')], ephemeral: true });
            return;
        }
        const panelDesc = description ||
            'Need assistance? Our team is here to help.\n\n' +
                'Click the button below to create a private support ticket channel.\n' +
                'A team member will be dispatched to assist you promptly.';
        const embed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
        embed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.BRAND);
        embed.setTitle(panelTitle);
        embed.setDescription(panelDesc);
        const openButton = new discord_js_1.ButtonBuilder()
            .setCustomId(`kraxx_ticket_create:${panelCategory}`)
            .setLabel('Create Ticket')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('📩');
        const row = new discord_js_1.ActionRowBuilder().addComponents(openButton);
        const message = await channel.send({ embeds: [embed], components: [row] });
        try {
            await ticket_repository_1.TicketRepository.createPanel({
                guildId: interaction.guildId, executorId: interaction.user.id,
                title: panelTitle, description: panelDesc, category: panelCategory,
                channelId: channel.id, messageId: message.id,
            });
        }
        catch {
            let messageRemoved = true;
            await message.delete().catch(() => { messageRemoved = false; });
            logger_1.logger.error({ guildId: interaction.guildId, channelId: channel.id }, 'Ticket panel persistence failed');
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Panel Not Saved', messageRemoved
                        ? 'The panel message was removed because its configuration could not be saved.'
                        : 'The unregistered panel message may remain, but its buttons are inactive because no tenant panel record was saved.')], ephemeral: true });
            return;
        }
        await audit_service_1.AuditService.logEvent(interaction.guild, 'TICKET_PANEL_CREATE', interaction.user.id, message.id, 'Ticket panel created', 'SUCCESS', false).catch(() => { });
        await interaction.reply({
            embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Panel Created', `Ticket panel established in ${channel}.`)],
            ephemeral: true,
        });
        logger_1.logger.info({ executor: interaction.user.tag, channel: channel.name }, 'Ticket panel deployed');
    }
    /**
     * Deploys the multi-category ticket support panel with all category buttons.
     */
    static async setupMultiCategoryPanel(interaction, targetChannel, bannerUrl) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channel = (targetChannel || interaction.channel);
        if (!channel || channel.guildId !== interaction.guildId || channel.type !== discord_js_1.ChannelType.GuildText) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Invalid channel specified.')],
                ephemeral: true,
            });
            return;
        }
        const embed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
        embed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.BRAND);
        embed.setTitle('KRAXXBot │ SUPPORT & ASSISTANCE');
        let descText = 'Select a category below to open a private support ticket:\n\n';
        exports.TICKET_CATEGORIES.forEach(cat => {
            descText += `${cat.emoji} **${cat.label}**\n• ${cat.description}\n\n`;
        });
        embed.setDescription(descText);
        if (bannerUrl) {
            embed.setImage(bannerUrl);
        }
        const rows = [];
        let currentRow = new discord_js_1.ActionRowBuilder();
        exports.TICKET_CATEGORIES.forEach((cat, index) => {
            const btn = new discord_js_1.ButtonBuilder()
                .setCustomId(`kraxx_ticket_create:${cat.key}`)
                .setLabel(cat.label)
                .setStyle(cat.style);
            try {
                btn.setEmoji(cat.emoji);
            }
            catch {
                // Ignore invalid emoji
            }
            currentRow.addComponents(btn);
            if ((index + 1) % 5 === 0 || index === exports.TICKET_CATEGORIES.length - 1) {
                rows.push(currentRow);
                currentRow = new discord_js_1.ActionRowBuilder();
            }
        });
        const message = await channel.send({ embeds: [embed], components: rows });
        try {
            await ticket_repository_1.TicketRepository.createPanel({
                guildId: interaction.guildId, executorId: interaction.user.id,
                title: 'KRAXXBot │ SUPPORT & ASSISTANCE', description: descText, category: 'MULTI',
                channelId: channel.id, messageId: message.id,
            });
        }
        catch {
            let messageRemoved = true;
            await message.delete().catch(() => { messageRemoved = false; });
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Panel Not Saved', messageRemoved
                        ? 'The panel message was removed because its configuration could not be saved.'
                        : 'The unregistered panel message may remain, but its buttons are inactive because no tenant panel record was saved.')], ephemeral: true });
            return;
        }
        await audit_service_1.AuditService.logEvent(interaction.guild, 'TICKET_PANEL_CREATE', interaction.user.id, message.id, 'Multi-category panel created', 'SUCCESS', false).catch(() => { });
        await interaction.reply({
            embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Support Panel Deployed', `Multi-category ticket panel established in ${channel}.`)],
            ephemeral: true,
        });
    }
    /**
     * Lists active ticket panels.
     */
    static async listTicketPanels(interaction) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const panels = await ticket_repository_1.TicketRepository.findPanelsByGuild(interaction.guildId);
        if (panels.length === 0) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('TICKET PANELS', 'TICKETS').setDescription('No ticket panels configured.')],
                ephemeral: true,
            });
            return;
        }
        const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('ACTIVE TICKET PANELS', 'TICKETS');
        const lines = panels.map((p) => `• **ID:** \`${p.id}\` │ **Title:** ${p.title} │ **Channel:** <#${p.channelId}> │ **Category:** \`${p.category}\``);
        embed.setDescription(lines.join('\n\n'));
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    /**
     * Deletes a ticket panel by ID.
     */
    static async deleteTicketPanel(interaction, panelId) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const panel = await ticket_repository_1.TicketRepository.findPanelById(panelId, interaction.guildId);
        if (!panel) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Not Found', `No panel found with ID \`${panelId}\`.`)],
                ephemeral: true,
            });
            return;
        }
        await ticket_repository_1.TicketRepository.deletePanel(panelId, interaction.guildId, interaction.user.id);
        const panelChannel = await interaction.guild?.channels.fetch(panel.channelId).catch(() => null);
        let messageRemoved = true;
        if (panelChannel?.guildId === interaction.guildId && panel.messageId && panelChannel.isTextBased()) {
            const panelMessage = await panelChannel.messages.fetch(panel.messageId).catch(() => null);
            if (panelMessage)
                await panelMessage.delete().catch(() => { messageRemoved = false; });
        }
        await audit_service_1.AuditService.logEvent(interaction.guild, 'TICKET_PANEL_DELETE', interaction.user.id, panelId, 'Ticket panel config deleted', 'SUCCESS', false).catch(() => { });
        await interaction.reply({
            embeds: [messageRemoved
                    ? kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Panel Deleted', `Ticket panel \`${panelId}\` removed.`)
                    : kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Panel Message Cleanup Failed', `The panel configuration was removed, but its message in <#${panel.channelId}> could not be deleted.`)],
            ephemeral: true,
        });
    }
    /**
     * Finds or creates a Discord Category channel for open tickets.
     */
    static async getOrCreateOpenCategory(guild, categoryKey) {
        const spec = exports.TICKET_CATEGORIES.find(c => c.key === categoryKey);
        const categoryName = spec ? `----${spec.emoji} ${spec.label}----` : '----OPEN TICKETS----';
        let category = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase());
        if (!category) {
            try {
                category = await guild.channels.create({
                    name: categoryName,
                    type: discord_js_1.ChannelType.GuildCategory,
                });
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Failed to create open ticket category channel');
                return null;
            }
        }
        return category;
    }
    /**
     * Finds or creates a Discord Category channel for closed tickets.
     */
    static async getOrCreateClosedCategory(guild, categoryKey) {
        const spec = exports.TICKET_CATEGORIES.find(c => c.key === categoryKey);
        const categoryName = spec ? `Closed:- ${spec.emoji} ${spec.label}` : 'Closed Tickets';
        let category = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase());
        if (!category) {
            try {
                category = await guild.channels.create({
                    name: categoryName,
                    type: discord_js_1.ChannelType.GuildCategory,
                });
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Failed to create closed ticket category channel');
                return null;
            }
        }
        return category;
    }
    static async synchronizeTicketChannelState(channel, ticket, guild, open) {
        const oldName = channel.name;
        const oldParentId = channel.parentId;
        const previousOverwrite = channel.permissionOverwrites.cache.get(ticket.openerId);
        const oldSendMessages = previousOverwrite
            ? previousOverwrite.allow.has(discord_js_1.PermissionFlagsBits.SendMessages) ? true
                : previousOverwrite.deny.has(discord_js_1.PermissionFlagsBits.SendMessages) ? false : null
            : null;
        const restore = async () => {
            if (previousOverwrite)
                await channel.permissionOverwrites.edit(ticket.openerId, { SendMessages: oldSendMessages });
            else
                await channel.permissionOverwrites.delete(ticket.openerId).catch(() => { });
            if (oldParentId)
                await channel.setParent(oldParentId, { lockPermissions: false });
            else
                await channel.setParent(null, { lockPermissions: false });
            if (channel.name !== oldName)
                await channel.setName(oldName);
        };
        try {
            const category = open
                ? await this.getOrCreateOpenCategory(guild, ticket.category)
                : await this.getOrCreateClosedCategory(guild, ticket.category);
            if (!category)
                throw new Error('Ticket category could not be resolved.');
            await channel.setName(`${open ? 'ticket' : 'closed'}-${String(ticket.ticketNumber).padStart(4, '0')}`);
            await channel.permissionOverwrites.edit(ticket.openerId, { SendMessages: open });
            await channel.setParent(category.id, { lockPermissions: false });
        }
        catch (error) {
            try {
                await restore();
            }
            catch {
                logger_1.logger.error({ guildId: guild.id, channelId: channel.id }, 'Ticket channel recovery failed after a Discord mutation error');
                throw new ticket_repository_1.TicketRecoveryRequiredError(channel.id, false);
            }
            throw error;
        }
        return restore;
    }
    /**
     * Finds or creates the dedicated management-only TICKET-TRANSCRIPTS category and #ticket-transcripts channel.
     */
    static async getOrCreateTranscriptChannel(guild) {
        const guildData = await guild_repository_1.GuildRepository.findById(guild.id);
        const transcriptChannelId = guildData?.settings?.ticketTranscriptsChannelId;
        // 1. Check if ticketTranscriptsChannelId is set and exists
        if (transcriptChannelId && transcriptChannelId.trim().length > 0) {
            const existing = guild.channels.cache.get(transcriptChannelId.trim());
            if (existing && existing.isTextBased())
                return existing;
        }
        // 2. Find or create TICKET-TRANSCRIPTS category
        let transcriptCategory = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory && c.name.toUpperCase() === 'TICKET-TRANSCRIPTS');
        const mgmtRoles = [
            guildData?.settings?.adminRoleId,
            guildData?.settings?.modRoleId,
            guildData?.settings?.supportRoleId,
        ].filter((id) => Boolean(id && id.trim().length > 0));
        const categoryOverwrites = [
            {
                id: guild.id,
                deny: [discord_js_1.PermissionFlagsBits.ViewChannel],
            },
        ];
        if (guild.client.user) {
            categoryOverwrites.push({
                id: guild.client.user.id,
                allow: [
                    discord_js_1.PermissionFlagsBits.ViewChannel,
                    discord_js_1.PermissionFlagsBits.SendMessages,
                    discord_js_1.PermissionFlagsBits.AttachFiles,
                    discord_js_1.PermissionFlagsBits.EmbedLinks,
                    discord_js_1.PermissionFlagsBits.ManageChannels,
                ],
            });
        }
        for (const rId of mgmtRoles) {
            categoryOverwrites.push({
                id: rId,
                allow: [
                    discord_js_1.PermissionFlagsBits.ViewChannel,
                    discord_js_1.PermissionFlagsBits.SendMessages,
                    discord_js_1.PermissionFlagsBits.ReadMessageHistory,
                    discord_js_1.PermissionFlagsBits.ManageMessages,
                ],
            });
        }
        if (!transcriptCategory) {
            try {
                transcriptCategory = await guild.channels.create({
                    name: 'TICKET-TRANSCRIPTS',
                    type: discord_js_1.ChannelType.GuildCategory,
                    permissionOverwrites: categoryOverwrites,
                });
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Failed to create TICKET-TRANSCRIPTS category channel');
            }
        }
        // 3. Find or create #ticket-transcripts channel
        let transcriptChannel = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildText && c.name.toLowerCase() === 'ticket-transcripts');
        if (!transcriptChannel) {
            try {
                transcriptChannel = await guild.channels.create({
                    name: 'ticket-transcripts',
                    type: discord_js_1.ChannelType.GuildText,
                    parent: transcriptCategory ? transcriptCategory.id : undefined,
                    permissionOverwrites: categoryOverwrites,
                    topic: 'KRAXXBot Archive │ Restricted Support Ticket Transcripts',
                });
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Failed to create #ticket-transcripts channel');
                return null;
            }
        }
        return transcriptChannel;
    }
    /**
     * Finds or creates the dedicated management-only TICKET-LOGS channel.
     */
    static async getOrCreateTicketLogChannel(guild) {
        const guildData = await guild_repository_1.GuildRepository.findById(guild.id);
        const ticketLogId = guildData?.settings?.ticketLogsChannelId || guildData?.settings?.logChannelId;
        if (ticketLogId && ticketLogId.trim().length > 0) {
            const existing = guild.channels.cache.get(ticketLogId.trim());
            if (existing && existing.isTextBased())
                return existing;
        }
        let logCategory = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory && c.name.toUpperCase() === 'TICKET-LOGS');
        const mgmtRoles = [
            guildData?.settings?.adminRoleId,
            guildData?.settings?.modRoleId,
            guildData?.settings?.supportRoleId,
        ].filter((id) => Boolean(id && id.trim().length > 0));
        const categoryOverwrites = [
            {
                id: guild.id,
                deny: [discord_js_1.PermissionFlagsBits.ViewChannel],
            },
        ];
        if (guild.client.user) {
            categoryOverwrites.push({
                id: guild.client.user.id,
                allow: [
                    discord_js_1.PermissionFlagsBits.ViewChannel,
                    discord_js_1.PermissionFlagsBits.SendMessages,
                    discord_js_1.PermissionFlagsBits.EmbedLinks,
                    discord_js_1.PermissionFlagsBits.ManageChannels,
                ],
            });
        }
        for (const rId of mgmtRoles) {
            categoryOverwrites.push({
                id: rId,
                allow: [
                    discord_js_1.PermissionFlagsBits.ViewChannel,
                    discord_js_1.PermissionFlagsBits.ReadMessageHistory,
                ],
            });
        }
        if (!logCategory) {
            try {
                logCategory = await guild.channels.create({
                    name: 'TICKET-LOGS',
                    type: discord_js_1.ChannelType.GuildCategory,
                    permissionOverwrites: categoryOverwrites,
                });
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Failed to create TICKET-LOGS category channel');
            }
        }
        let logChannel = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildText && c.name.toLowerCase() === 'ticket-logs');
        if (!logChannel) {
            try {
                logChannel = await guild.channels.create({
                    name: 'ticket-logs',
                    type: discord_js_1.ChannelType.GuildText,
                    parent: logCategory ? logCategory.id : undefined,
                    permissionOverwrites: categoryOverwrites,
                    topic: 'KRAXXBot Audit │ Support Ticket System Event Logs',
                });
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Failed to create #ticket-logs channel');
                return null;
            }
        }
        return logChannel;
    }
    /**
     * Sends audit/event log embeds to #ticket-logs.
     */
    static async postTicketLog(guild, embed) {
        try {
            const logChannel = await this.getOrCreateTicketLogChannel(guild);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        }
        catch (err) {
            logger_1.logger.warn({ err }, 'Failed to post ticket log entry');
        }
    }
    static async sendTicketOpeningMessage(channel, member, ticketNumber, displayCategory, guild, managementRoleIds) {
        const numStr = String(ticketNumber).padStart(4, '0');
        const header = new kraxxEmbedBuilder_1.KraxxEmbedBuilder()
            .setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.BRAND)
            .setTitle(`SUPPORT TICKET #${numStr} │ ${displayCategory.toUpperCase()}`)
            .setDescription(`Welcome ${member}! Support team has been dispatched.\n\nPlease describe your issue or inquiry in detail so our team can assist you efficiently.`)
            .addFields({ name: 'Opened By', value: `<@${member.id}>`, inline: true }, { name: 'Category', value: `\`${displayCategory}\``, inline: true }, { name: 'Status', value: '`OPEN`', inline: true });
        const claim = new discord_js_1.ButtonBuilder().setCustomId('kraxx_ticket_claim').setLabel('Claim Ticket').setStyle(discord_js_1.ButtonStyle.Success).setEmoji('🖐️');
        const close = new discord_js_1.ButtonBuilder().setCustomId('kraxx_ticket_close').setLabel('Close Ticket').setStyle(discord_js_1.ButtonStyle.Danger).setEmoji('🔒');
        const content = managementRoleIds.length
            ? `${member} ${managementRoleIds.map(id => `<@&${id}>`).join(' ')}`
            : `${member} <@${guild.ownerId}>`;
        await channel.send({
            content,
            embeds: [header],
            components: [new discord_js_1.ActionRowBuilder().addComponents(claim, close)],
            allowedMentions: { users: [member.id], roles: managementRoleIds },
        });
    }
    /**
     * Handles user clicking any "Create Ticket" category button.
     */
    static async handleCreateTicketButton(interaction, categoryKey = 'GENERAL') {
        const guild = interaction.guild;
        const member = interaction.member;
        if (!guild || !member) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Guild or member context missing.')],
                ephemeral: true,
            });
            return;
        }
        if (interaction.guildId !== guild.id || member.guild.id !== guild.id || member.id !== interaction.user.id) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Guild/member context is inconsistent.')], ephemeral: true });
            return;
        }
        const panel = await ticket_repository_1.TicketRepository.findPanelByMessageId(interaction.message.id, guild.id);
        if (!panel || (panel.category !== 'MULTI' && panel.category !== categoryKey)) {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Panel Unavailable', 'This ticket panel is no longer active for this server.')], ephemeral: true });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        let persistedTicket = null;
        let createdTicket = false;
        try {
            if (!(await guild_repository_1.GuildRepository.isModuleEnabled(guild.id, 'tickets'))) {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Tickets Disabled', 'Ticket creation is disabled for this server.')] });
                return;
            }
            const catSpec = exports.TICKET_CATEGORIES.find(c => c.key === categoryKey);
            if (!catSpec && categoryKey !== 'GENERAL') {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Category', 'This ticket category is not configured.')] });
                return;
            }
            const displayCat = catSpec ? catSpec.label : categoryKey.toUpperCase();
            // Build strictly scoped permission overwrites
            const overwrites = [
                {
                    id: guild.id,
                    deny: [discord_js_1.PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [
                        discord_js_1.PermissionFlagsBits.ViewChannel,
                        discord_js_1.PermissionFlagsBits.SendMessages,
                        discord_js_1.PermissionFlagsBits.ReadMessageHistory,
                        discord_js_1.PermissionFlagsBits.AttachFiles,
                        discord_js_1.PermissionFlagsBits.EmbedLinks,
                    ],
                },
            ];
            if (interaction.client.user) {
                overwrites.push({
                    id: interaction.client.user.id,
                    allow: [
                        discord_js_1.PermissionFlagsBits.ViewChannel,
                        discord_js_1.PermissionFlagsBits.SendMessages,
                        discord_js_1.PermissionFlagsBits.ManageChannels,
                        discord_js_1.PermissionFlagsBits.EmbedLinks,
                        discord_js_1.PermissionFlagsBits.AttachFiles,
                    ],
                });
            }
            const guildData = await guild_repository_1.GuildRepository.findById(guild.id);
            if (!guild.members.me?.permissions.has(discord_js_1.PermissionFlagsBits.ManageChannels)) {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Missing Bot Permission', 'The bot needs Manage Channels to create private ticket channels.')] });
                return;
            }
            const mgmtRoleIds = [
                guildData?.settings?.adminRoleId,
                guildData?.settings?.modRoleId,
                guildData?.settings?.supportRoleId,
                guildData?.settings?.staffRoleId,
            ].filter((id) => Boolean(id && id.trim().length > 0 && id !== guild.id && guild.roles.cache.has(id)));
            for (const rId of mgmtRoleIds) {
                overwrites.push({
                    id: rId,
                    allow: [
                        discord_js_1.PermissionFlagsBits.ViewChannel,
                        discord_js_1.PermissionFlagsBits.SendMessages,
                        discord_js_1.PermissionFlagsBits.ReadMessageHistory,
                        discord_js_1.PermissionFlagsBits.ManageMessages,
                    ],
                });
            }
            // Find or create category for this open ticket
            const configuredCategoryId = guildData?.settings?.ticketCategoryId;
            const configuredCategory = configuredCategoryId ? guild.channels.cache.get(configuredCategoryId) : undefined;
            if (configuredCategoryId && (!configuredCategory || configuredCategory.type !== discord_js_1.ChannelType.GuildCategory || configuredCategory.guildId !== guild.id)) {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Category Unavailable', 'The configured ticket category is missing or does not belong to this server.')] });
                return;
            }
            const openCategory = configuredCategory
                ? configuredCategory
                : await this.getOrCreateOpenCategory(guild, categoryKey);
            const result = await ticket_domain_service_1.TicketDomainService.create({
                guildId: guild.id,
                actorId: member.id,
                authorized: true,
                creationKey: interaction.id,
                category: categoryKey,
                subject: `Support Ticket (${displayCat})`,
            }, async (ticketNumber) => {
                const numStr = String(ticketNumber).padStart(4, '0');
                const topic = `KRAXX Support Ticket #${numStr} | Opener: ${member.user.tag} | Category: ${displayCat} | Request: ${interaction.id}`;
                let channel;
                try {
                    channel = await guild.channels.create({
                        name: `ticket-${numStr}`,
                        type: discord_js_1.ChannelType.GuildText,
                        parent: openCategory ? openCategory.id : undefined,
                        permissionOverwrites: overwrites,
                        topic,
                    });
                }
                catch (creationError) {
                    const status = Number(creationError.status);
                    if (status >= 400 && status < 500)
                        throw creationError;
                    let possibleChannel;
                    try {
                        const channels = await guild.channels.fetch();
                        possibleChannel = channels.find((candidate) => Boolean(candidate && candidate.type === discord_js_1.ChannelType.GuildText && candidate.topic === topic));
                    }
                    catch {
                        throw new ticket_repository_1.TicketCreationOutcomeUnknownError(interaction.id);
                    }
                    if (!possibleChannel)
                        throw new ticket_repository_1.TicketCreationOutcomeUnknownError(interaction.id);
                    try {
                        await possibleChannel.delete('Ticket channel creation response was ambiguous');
                    }
                    catch {
                        throw new ticket_repository_1.TicketOrphanedChannelError(possibleChannel.id);
                    }
                    throw creationError;
                }
                try {
                    await this.sendTicketOpeningMessage(channel, member, ticketNumber, displayCat, guild, mgmtRoleIds);
                }
                catch (sendError) {
                    try {
                        await channel.delete('Ticket opening message failed');
                    }
                    catch {
                        throw new ticket_repository_1.TicketOrphanedChannelError(channel.id);
                    }
                    throw sendError;
                }
                return channel;
            }, async (channelId) => {
                const channel = await guild.channels.fetch(channelId);
                if (channel && channel.guildId === guild.id)
                    await channel.delete('Ticket persistence rolled back');
            });
            persistedTicket = result.ticket;
            createdTicket = result.created;
            const nextNum = result.ticket.ticketNumber;
            const numStr = String(nextNum).padStart(4, '0');
            if (!result.created) {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Ticket Already Created', `This interaction already created <#${result.ticket.channelId}>.`)] });
                return;
            }
            const resolvedTicketChannel = await guild.channels.fetch(result.ticket.channelId);
            if (!resolvedTicketChannel || resolvedTicketChannel.guildId !== guild.id || resolvedTicketChannel.type !== discord_js_1.ChannelType.GuildText)
                throw new Error('Persisted ticket channel could not be resolved.');
            await audit_service_1.AuditService.logEvent(interaction.guild, 'TICKET_CREATE', interaction.user.id, result.ticket.id, `Ticket #${numStr}`, 'SUCCESS', false).catch(() => {
                logger_1.logger.warn({ guildId: guild.id, ticketId: result.ticket.id }, 'Ticket audit notification failed after canonical audit commit');
            });
            await interaction.editReply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Ticket Created', `Your support ticket has been created in ${resolvedTicketChannel}.`)],
            });
            // Log event
            const logEmbed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
            logEmbed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.BRAND);
            logEmbed.setTitle(`TICKET EVENT │ CREATED #${numStr}`);
            logEmbed.setDescription(`Ticket channel ${resolvedTicketChannel} created by ${member}.`);
            logEmbed.addFields({ name: 'Ticket Number', value: `#${numStr}`, inline: true }, { name: 'Opener', value: `<@${member.id}>`, inline: true }, { name: 'Category', value: `\`${displayCat}\``, inline: true });
            this.postTicketLog(guild, logEmbed).catch(() => { });
            logger_1.logger.info({ opener: member.user.tag, ticketChannel: resolvedTicketChannel.name }, 'Ticket created');
        }
        catch (error) {
            if (error instanceof ticket_repository_1.TicketCreationOutcomeUnknownError) {
                logger_1.logger.error({ guildId: guild.id, creationKey: error.creationKey, auditPersisted: error.auditPersisted }, 'Ticket channel creation outcome is unknown');
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Creation Needs Review', `Discord did not confirm whether a channel was created. Do not retry yet. Give server staff request ID ${error.creationKey}; audit recorded: ${error.auditPersisted ? 'yes' : 'no'}.`)] });
                return;
            }
            if (error instanceof ticket_repository_1.TicketOrphanedChannelError) {
                logger_1.logger.error({ guildId: guild.id, channelId: error.channelId, auditPersisted: error.auditPersisted }, 'Ticket creation left a recoverable orphan channel');
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Setup Needs Recovery', `The ticket channel may exist without a saved ticket. Share channel ID \`${error.channelId}\` with server staff. Audit recorded: ${error.auditPersisted ? 'yes' : 'no'}.`)] });
                return;
            }
            logger_1.logger.error({ err: error, guildId: guild.id, ticketId: persistedTicket?.id }, 'Ticket creation failed');
            if (createdTicket && persistedTicket) {
                await audit_service_1.AuditService.logEvent(guild, 'TICKET_CREATE_SETUP_FAILURE', interaction.user.id, persistedTicket.id, 'Discord ticket header delivery failed', 'FAILURE').catch(() => { });
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Created, Setup Incomplete', `Ticket #${persistedTicket.ticketNumber} exists in <#${persistedTicket.channelId}>, but confirmation could not be completed. Refresh before retrying.`)] });
            }
            else {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Not Created', 'Ticket channel creation failed. No active ticket record was committed; retry when Discord is available.')] });
            }
        }
    }
    /**
     * Claims a support ticket for the executing user.
     */
    static async claimTicket(interaction) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channelId = interaction.channelId;
        if (!channelId)
            return;
        const ticket = await ticket_repository_1.TicketRepository.findByChannelId(channelId, interaction.guildId);
        if (!ticket) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'This ticket no longer exists or has already been removed.')],
                ephemeral: true,
            });
            return;
        }
        if (ticket.status === 'CLOSED') {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Closed', 'This ticket is closed.')],
                ephemeral: true,
            });
            return;
        }
        const claimer = interaction.user;
        await ticket_domain_service_1.TicketDomainService.transition(interaction.guildId, ticket.id, { id: claimer.id, authorized: true }, 'CLAIM');
        await audit_service_1.AuditService.logEvent(interaction.guild, 'TICKET_CLAIM', interaction.user.id, ticket.id, `Ticket #${ticket.ticketNumber}`, 'SUCCESS', false).catch(() => { });
        const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Ticket Claimed', `Ticket claimed by ${claimer}. They will handle your request.`);
        await interaction.reply({ embeds: [embed] });
        if (interaction.guild) {
            const logEmbed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
            logEmbed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.NEUTRAL);
            logEmbed.setTitle(`TICKET EVENT │ CLAIMED #${ticket.ticketNumber}`);
            logEmbed.setDescription(`Ticket #${ticket.ticketNumber} claimed by ${claimer}.`);
            logEmbed.addFields({ name: 'Claimer', value: `<@${claimer.id}>`, inline: true }, { name: 'Opener', value: `<@${ticket.openerId}>`, inline: true });
            this.postTicketLog(interaction.guild, logEmbed).catch(() => { });
        }
        logger_1.logger.info({ claimer: claimer.tag, ticketChannel: channelId }, 'Ticket claimed');
    }
    /**
     * Unclaims a support ticket.
     */
    static async unclaimTicket(interaction) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channelId = interaction.channelId;
        const ticket = await ticket_repository_1.TicketRepository.findByChannelId(channelId, interaction.guildId);
        if (!ticket) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'This ticket no longer exists or has already been removed.')],
                ephemeral: true,
            });
            return;
        }
        await ticket_domain_service_1.TicketDomainService.transition(interaction.guildId, ticket.id, { id: interaction.user.id, authorized: true }, 'UNCLAIM');
        await audit_service_1.AuditService.logEvent(interaction.guild, 'TICKET_UNCLAIM', interaction.user.id, ticket.id, `Ticket #${ticket.ticketNumber}`, 'SUCCESS', false).catch(() => { });
        await interaction.reply({
            embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Ticket Unclaimed', 'This ticket is no longer claimed and is open for staff.')],
        });
        if (interaction.guild) {
            const logEmbed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
            logEmbed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.WARNING);
            logEmbed.setTitle(`TICKET EVENT │ UNCLAIMED #${ticket.ticketNumber}`);
            logEmbed.setDescription(`Ticket #${ticket.ticketNumber} unclaimed by <@${interaction.user.id}>.`);
            this.postTicketLog(interaction.guild, logEmbed).catch(() => { });
        }
    }
    /**
     * Closes a support ticket: renames channel, moves down to closed category, revokes send permissions, archives transcript & posts controls.
     */
    static async closeTicket(interaction, reason) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channelId = interaction.channelId;
        const channel = interaction.channel;
        const guild = interaction.guild;
        const ticket = await ticket_repository_1.TicketRepository.findByChannelId(channelId, interaction.guildId);
        if (!ticket || !channel || !guild || channel.guildId !== interaction.guildId || channel.id !== ticket.channelId) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Command must be run inside an active ticket channel.')],
                ephemeral: true,
            });
            return;
        }
        if (ticket.status === 'CLOSED') {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Already Closed', 'This ticket is already closed.')],
                ephemeral: true,
            });
            return;
        }
        const numStr = String(ticket.ticketNumber).padStart(4, '0');
        try {
            await ticket_domain_service_1.TicketDomainService.transition(interaction.guildId, ticket.id, { id: interaction.user.id, authorized: true }, 'CLOSE', reason || 'Closed by KRAXX Management', () => this.synchronizeTicketChannelState(channel, ticket, guild, false));
        }
        catch (error) {
            logger_1.logger.warn({ guildId: guild.id, ticketId: ticket.id }, 'Ticket close did not commit');
            const recovery = error instanceof ticket_repository_1.TicketRecoveryRequiredError
                ? ` Recovery is required for channel ${error.channelId}; audit recorded: ${error.auditPersisted ? 'yes' : 'no'}.`
                : '';
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Not Closed', `Discord or database rejected the close operation; refresh the ticket before retrying.${recovery}`)], ephemeral: true });
            return;
        }
        await audit_service_1.AuditService.logEvent(interaction.guild, 'TICKET_CLOSE', interaction.user.id, ticket.id, `Ticket #${numStr}`, 'SUCCESS', false).catch(() => { });
        // 4. Send Closed Header & Control Buttons
        const closeEmbed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
        closeEmbed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.WARNING);
        closeEmbed.setTitle(`TICKET CLOSED │ #${numStr}`);
        closeEmbed.setDescription(`Ticket Closed by <@${interaction.user.id}>\n${reason ? `**Reason:** ${reason}\n\n` : ''}` +
            `**Support Team Ticket Controls:**`);
        const transcriptBtn = new discord_js_1.ButtonBuilder()
            .setCustomId('kraxx_ticket_transcript')
            .setLabel('Transcript')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji('📄');
        const reopenBtn = new discord_js_1.ButtonBuilder()
            .setCustomId('kraxx_ticket_reopen')
            .setLabel('Open')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('🔓');
        const deleteBtn = new discord_js_1.ButtonBuilder()
            .setCustomId('kraxx_ticket_delete')
            .setLabel('Delete')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji('⛔');
        const row = new discord_js_1.ActionRowBuilder().addComponents(transcriptBtn, reopenBtn, deleteBtn);
        await interaction.reply({ embeds: [closeEmbed], components: [row] });
        // 5. Automatically generate and archive transcript to #ticket-transcripts in TICKET-TRANSCRIPTS category
        this.archiveTranscript(channel, ticket, interaction.user).catch(err => {
            logger_1.logger.error({ err }, 'Failed to archive transcript during ticket close');
        });
        // 6. Log closure event
        const logEmbed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
        logEmbed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.WARNING);
        logEmbed.setTitle(`TICKET EVENT │ CLOSED #${numStr}`);
        logEmbed.setDescription(`Ticket #${numStr} closed by <@${interaction.user.id}>.`);
        logEmbed.addFields({ name: 'Opener', value: `<@${ticket.openerId}>`, inline: true }, { name: 'Reason', value: reason || 'N/A', inline: true });
        this.postTicketLog(guild, logEmbed).catch(() => { });
        logger_1.logger.info({ closer: interaction.user.tag, ticketNumber: ticket.ticketNumber }, 'Ticket closed & transcript archived');
    }
    /**
     * Reopens a closed support ticket.
     */
    static async reopenTicket(interaction) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channelId = interaction.channelId;
        const channel = interaction.channel;
        const guild = interaction.guild;
        const ticket = await ticket_repository_1.TicketRepository.findByChannelId(channelId, interaction.guildId);
        if (!ticket || !channel || !guild || channel.guildId !== interaction.guildId || channel.id !== ticket.channelId) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Command must be run inside a ticket channel.')],
                ephemeral: true,
            });
            return;
        }
        if (ticket.status !== 'CLOSED') {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Not Closed', 'Only a closed ticket can be reopened.')], ephemeral: true });
            return;
        }
        const numStr = String(ticket.ticketNumber).padStart(4, '0');
        try {
            await ticket_domain_service_1.TicketDomainService.transition(interaction.guildId, ticket.id, { id: interaction.user.id, authorized: true }, 'REOPEN', undefined, () => this.synchronizeTicketChannelState(channel, ticket, guild, true));
        }
        catch (error) {
            const recovery = error instanceof ticket_repository_1.TicketRecoveryRequiredError
                ? ` Recovery is required for channel ${error.channelId}; audit recorded: ${error.auditPersisted ? 'yes' : 'no'}.`
                : '';
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Not Reopened', `Discord or database rejected the reopen operation; refresh the ticket before retrying.${recovery}`)], ephemeral: true });
            return;
        }
        await audit_service_1.AuditService.logEvent(interaction.guild, 'TICKET_REOPEN', interaction.user.id, ticket.id, `Ticket #${numStr}`, 'SUCCESS', false).catch(() => { });
        await interaction.reply({
            embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Ticket Reopened', `Ticket #${numStr} has been reopened and moved back to active tickets.`)],
        });
        const logEmbed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
        logEmbed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.SECURITY);
        logEmbed.setTitle(`TICKET EVENT │ REOPENED #${numStr}`);
        logEmbed.setDescription(`Ticket #${numStr} reopened by <@${interaction.user.id}>.`);
        this.postTicketLog(guild, logEmbed).catch(() => { });
    }
    /**
     * Deletes a ticket channel and database entry, then cleans up empty dynamic categories safely.
     */
    static async deleteTicketChannel(interaction) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channelId = interaction.channelId;
        const channel = interaction.channel;
        const guild = interaction.guild;
        const ticket = await ticket_repository_1.TicketRepository.findByChannelId(channelId, interaction.guildId);
        if (!ticket || !channel || !guild || channel.guildId !== interaction.guildId || channel.id !== ticket.channelId) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'This ticket no longer exists or has already been removed.')],
                ephemeral: true,
            });
            return;
        }
        if (ticket.status !== 'CLOSED') {
            await interaction.reply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Not Closed', 'Close the ticket before deleting its channel.')], ephemeral: true });
            return;
        }
        const parentCategory = channel.parent;
        const parentCategoryId = parentCategory ? parentCategory.id : null;
        const parentCategoryName = parentCategory ? parentCategory.name : null;
        await interaction.deferReply({ ephemeral: true });
        try {
            const archived = await this.archiveTranscript(channel, ticket, interaction.user);
            if (!archived) {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Not Deleted', 'A transcript could not be verified in the archive channel, so the ticket was retained.')] });
                return;
            }
            await ticket_domain_service_1.TicketDomainService.transition(interaction.guildId, ticket.id, { id: interaction.user.id, authorized: true }, 'DELETE', undefined, async () => {
                await channel.delete('Ticket archived and deleted');
                return async () => { throw new Error('Deleted Discord channels cannot be restored automatically.'); };
            });
            await audit_service_1.AuditService.logEvent(guild, 'TICKET_DELETE', interaction.user.id, ticket.id, `Ticket #${ticket.ticketNumber}`, 'SUCCESS', false).catch(() => { });
            if (parentCategoryId && parentCategoryName)
                await TicketService.cleanupEmptyTicketCategory(guild, parentCategoryId, parentCategoryName);
            await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Ticket Deleted', `Ticket #${ticket.ticketNumber} was archived and deleted.`)] });
        }
        catch (error) {
            logger_1.logger.error({ guildId: guild.id, ticketId: ticket.id, channelId }, 'Ticket deletion failed or requires recovery');
            if (error instanceof ticket_repository_1.TicketRecoveryRequiredError) {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Deletion Needs Recovery', `Channel ${error.channelId} and database state may be inconsistent. Audit recorded: ${error.auditPersisted ? 'yes' : 'no'}. Contact server staff.`)] });
            }
            else {
                await interaction.editReply({ embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Ticket Not Deleted', 'Discord rejected the deletion; the database ticket was retained. Refresh before retrying.')] });
            }
        }
    }
    /**
     * Safely checks and cleans up empty dynamic ticket categories.
     */
    static async cleanupEmptyTicketCategory(guild, categoryId, categoryName) {
        try {
            const category = guild.channels.cache.get(categoryId);
            if (!category || category.type !== discord_js_1.ChannelType.GuildCategory)
                return;
            const lowerName = categoryName.toLowerCase();
            // Check permanent category whitelist safety
            if (PERMANENT_CATEGORIES_WHITELIST.some(w => lowerName.includes(w))) {
                return;
            }
            // Confirm it is a dynamically created ticket category (starts with ---- or Closed:-)
            const isDynamic = categoryName.startsWith('----') || categoryName.startsWith('Closed:-');
            if (!isDynamic)
                return;
            // Re-fetch channel children in guild cache
            const remainingChildren = guild.channels.cache.filter(c => c.parentId === categoryId);
            if (remainingChildren.size === 0) {
                await category.delete('Dynamic empty ticket category cleanup');
                const logEmbed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
                logEmbed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.NEUTRAL);
                logEmbed.setTitle('CATEGORY CLEANUP │ DYNAMIC CATEGORY REMOVED');
                logEmbed.setDescription(`Empty dynamic ticket category \`${categoryName}\` was automatically deleted.`);
                this.postTicketLog(guild, logEmbed).catch(() => { });
                logger_1.logger.info({ categoryName }, 'Empty dynamic ticket category automatically deleted');
            }
        }
        catch (err) {
            logger_1.logger.warn({ err, categoryId, categoryName }, 'Failed to cleanup empty category');
        }
    }
    /**
     * Adds or removes a user from ticket channel permissions.
     */
    static async modifyTicketUser(interaction, targetUser, action) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channel = interaction.channel;
        const ticket = await ticket_repository_1.TicketRepository.findByChannelId(channel.id, interaction.guildId);
        if (!ticket || !channel) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Command must be run inside an active ticket channel.')],
                ephemeral: true,
            });
            return;
        }
        if (action === 'add') {
            await channel.permissionOverwrites.edit(targetUser.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                EmbedLinks: true,
            });
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('User Added', `Added ${targetUser} to ticket access.`)],
            });
        }
        else {
            await channel.permissionOverwrites.delete(targetUser.id);
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('User Removed', `Removed ${targetUser} from ticket access.`)],
            });
        }
        if (interaction.guild) {
            const logEmbed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
            logEmbed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.NEUTRAL);
            logEmbed.setTitle(`TICKET EVENT │ USER ${action.toUpperCase()}ED #${ticket.ticketNumber}`);
            logEmbed.setDescription(`User ${targetUser} was ${action}ed to/from ticket \`${channel.name}\` by <@${interaction.user.id}>.`);
            this.postTicketLog(interaction.guild, logEmbed).catch(() => { });
        }
    }
    /**
     * Generates a transcript of all messages in the ticket channel.
     */
    static async generateTranscript(interaction) {
        const member = interaction.member;
        if (!(await this.verifyTicketManager(member))) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
                ephemeral: true,
            });
            return;
        }
        const channel = interaction.channel;
        const ticket = await ticket_repository_1.TicketRepository.findByChannelId(channel.id, interaction.guildId);
        if (!ticket || !channel) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Command must be run inside a ticket channel.')],
                ephemeral: true,
            });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        const messages = await channel.messages.fetch({ limit: 100 });
        const sorted = Array.from(messages.values()).reverse();
        let transcriptText = `============================================================\n`;
        transcriptText += `KRAXXBot SUPPORT TICKET TRANSCRIPT #${ticket.ticketNumber}\n`;
        transcriptText += `Subject: ${ticket.subject}\n`;
        transcriptText += `Category: ${ticket.category}\n`;
        transcriptText += `Opener ID: ${ticket.openerId}\n`;
        transcriptText += `Claimed By: ${ticket.claimerId || 'Unclaimed'}\n`;
        transcriptText += `Created: ${ticket.createdAt.toISOString()}\n`;
        transcriptText += `============================================================\n\n`;
        for (const m of sorted) {
            transcriptText += `[${m.createdAt.toISOString()}] ${m.author.tag} (${m.author.id}):\n${m.content || '[Embed/Attachment]'}\n\n`;
        }
        const buffer = Buffer.from(transcriptText, 'utf-8');
        const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: `transcript-ticket-${ticket.ticketNumber}.txt` });
        await interaction.editReply({
            embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Transcript Generated', `Compiled ${sorted.length} messages. Saved to management archives.`)],
            files: [attachment],
        });
        if (interaction.guild) {
            await this.archiveTranscript(channel, ticket, interaction.user);
        }
    }
    /**
     * Archives transcript .txt and rich embed to the dedicated management-only #ticket-transcripts channel.
     */
    static async archiveTranscript(channel, ticket, closedByUser) {
        const guild = channel.guild;
        const transcriptChannel = await this.getOrCreateTranscriptChannel(guild);
        if (!transcriptChannel) {
            logger_1.logger.warn('Unable to locate or create #ticket-transcripts channel for archiving');
            return false;
        }
        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        if (!messages)
            return false;
        const sorted = Array.from(messages.values()).reverse();
        let transcriptText = `============================================================\n`;
        transcriptText += `KRAXXBot SUPPORT TICKET TRANSCRIPT #${ticket.ticketNumber}\n`;
        transcriptText += `Ticket ID: ${ticket.id}\n`;
        transcriptText += `Channel Name: ${channel.name}\n`;
        transcriptText += `Subject: ${ticket.subject}\n`;
        transcriptText += `Category: ${ticket.category}\n`;
        transcriptText += `Opener ID: ${ticket.openerId}\n`;
        transcriptText += `Claimed By: ${ticket.claimerId ? ticket.claimerId : 'Unclaimed'}\n`;
        transcriptText += `Closed By: ${closedByUser.tag} (${closedByUser.id})\n`;
        transcriptText += `Created At: ${ticket.createdAt.toISOString()}\n`;
        transcriptText += `Closed At: ${new Date().toISOString()}\n`;
        transcriptText += `============================================================\n\n`;
        for (const m of sorted) {
            transcriptText += `[${m.createdAt.toISOString()}] ${m.author.tag} (${m.author.id}):\n${m.content || '[Embed/Attachment]'}\n\n`;
        }
        const buffer = Buffer.from(transcriptText, 'utf-8');
        const filename = `transcript-ticket-${String(ticket.ticketNumber).padStart(4, '0')}.txt`;
        const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: filename });
        const numStr = String(ticket.ticketNumber).padStart(4, '0');
        const embed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
        embed.setColor(kraxxEmbedBuilder_1.KRAXX_COLORS.SECURITY);
        embed.setTitle(`TRANSCRIPT ARCHIVE │ TICKET #${numStr}`);
        embed.setDescription(`Official transcript record archived for ticket \`ticket-${numStr}\`.`);
        embed.addFields({ name: 'Ticket ID', value: `\`${ticket.id}\``, inline: true }, { name: 'Ticket Creator', value: `<@${ticket.openerId}>`, inline: true }, { name: 'Category', value: `\`${ticket.category}\``, inline: true }, { name: 'Claimed By', value: ticket.claimerId ? `<@${ticket.claimerId}>` : '`Unclaimed`', inline: true }, { name: 'Created At', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:f>`, inline: true }, { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }, { name: 'Closed By', value: `<@${closedByUser.id}>`, inline: true }, { name: 'Ticket Status', value: '`CLOSED`', inline: true });
        const archiveMsg = await transcriptChannel.send({ embeds: [embed], files: [attachment] }).catch(() => null);
        if (!archiveMsg || !archiveMsg.attachments.first())
            return false;
        const url = archiveMsg.attachments.first()?.url;
        if (url) {
            await ticket_domain_service_1.TicketDomainService.recordTranscript(channel.guild.id, channel.id, closedByUser.id, url).catch(() => false);
        }
        return true;
    }
}
exports.TicketService = TicketService;
