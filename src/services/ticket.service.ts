import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  TextChannel,
  CategoryChannel,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  User,
  AttachmentBuilder,
  Guild,
} from 'discord.js';
import { TicketRepository } from '../database/repositories/ticket.repository';
import { KraxxEmbedBuilder, KRAXX_COLORS } from '../embeds/kraxxEmbedBuilder';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

export interface CategorySpec {
  key: string;
  label: string;
  emoji: string;
  description: string;
  style: ButtonStyle;
}

export const TICKET_CATEGORIES: CategorySpec[] = [
  // Row 1: Division & Services Support
  { key: 'kraxxsec', label: 'KRAXXSEC Support', emoji: '🛡️', description: 'Cybersecurity, security engineering & audit queries', style: ButtonStyle.Primary },
  { key: 'studio', label: 'KRAXX STUDIO Support', emoji: '🎨', description: 'Creative, digital, media & web design services', style: ButtonStyle.Primary },
  { key: 'operations', label: 'KRAXX Operations', emoji: '⚡', description: 'Parent organization operations & main HQ support', style: ButtonStyle.Primary },
  { key: 'project', label: 'Client Project Inquiry', emoji: '💼', description: 'New project proposals, quotes & client onboarding', style: ButtonStyle.Primary },
  { key: 'service_order', label: 'Service Request', emoji: '📑', description: 'Request specialized security or digital studio services', style: ButtonStyle.Primary },

  // Row 2: Business & Contact
  { key: 'billing', label: 'Billing & Invoices', emoji: '💳', description: 'Help with client billing, invoices & payment queries', style: ButtonStyle.Success },
  { key: 'collab', label: 'Partnership & Collab', emoji: '🤝', description: 'Business collaborations, sponsorships & media requests', style: ButtonStyle.Success },
  { key: 'contact_exec', label: 'Executive Contact', emoji: '📩', description: 'Direct contact with KRAXX Management & Leadership', style: ButtonStyle.Success },
  { key: 'personal', label: 'Personal Assistance', emoji: '🙋‍♂️', description: 'One-on-one help for confidential or account concerns', style: ButtonStyle.Success },
  { key: 'general', label: 'General Support', emoji: '💬', description: 'General questions or basic server guidance', style: ButtonStyle.Success },

  // Row 3: Technical & Safety
  { key: 'bugs', label: 'Bug & Tech Report', emoji: '🐞', description: 'Report bugs or technical issues in systems/bots', style: ButtonStyle.Danger },
  { key: 'access', label: 'Access & Roles', emoji: '🔑', description: 'Role requests, verification, or channel access', style: ButtonStyle.Danger },
  { key: 'infrastructure', label: 'Infrastructure & Hosting', emoji: '🌐', description: 'Server, cloud & network infrastructure assistance', style: ButtonStyle.Danger },
  { key: 'feedback', label: 'Feedback & Ideas', emoji: '💡', description: 'Community suggestions & feature proposals', style: ButtonStyle.Secondary },
  { key: 'emergency', label: 'Emergency Incident', emoji: '🚨', description: 'Urgent escalation or security incident reports', style: ButtonStyle.Danger },
];

export class TicketService {
  /**
   * Deploys a single panel or custom panel.
   */
  static async setupTicketPanel(
    interaction: ChatInputCommandInteraction,
    targetChannel?: TextChannel,
    title?: string,
    description?: string,
    category?: string
  ): Promise<void> {
    const channel = (targetChannel || interaction.channel) as TextChannel;
    if (!channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Invalid channel specified.')],
        ephemeral: true,
      });
      return;
    }

    const panelTitle = title || 'KRAXX HQ │ SUPPORT TICKETS';
    const panelDesc =
      description ||
      'Need assistance from KRAXX Management or Technical Support?\n\n' +
      'Click the button below to create a private support ticket channel.\n' +
      'Our team will be dispatched to assist you promptly.';

    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.BRAND);
    embed.setTitle(panelTitle);
    embed.setDescription(panelDesc);

    const openButton = new ButtonBuilder()
      .setCustomId(`kraxx_ticket_create:${category || 'GENERAL'}`)
      .setLabel('Create Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📩');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(openButton);

    const message = await channel.send({ embeds: [embed], components: [row] });

    await TicketRepository.createPanel({
      title: panelTitle,
      description: panelDesc,
      category: category || 'GENERAL',
      channelId: channel.id,
      messageId: message.id,
    });

    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Panel Created', `Ticket panel established in ${channel}.`)],
      ephemeral: true,
    });

    logger.info({ executor: interaction.user.tag, channel: channel.name }, 'Ticket panel deployed');
  }

  /**
   * Deploys the multi-category ticket support panel with all category buttons.
   */
  static async setupMultiCategoryPanel(
    interaction: ChatInputCommandInteraction,
    targetChannel?: TextChannel,
    bannerUrl?: string
  ): Promise<void> {
    const channel = (targetChannel || interaction.channel) as TextChannel;
    if (!channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Invalid channel specified.')],
        ephemeral: true,
      });
      return;
    }

    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.BRAND);
    embed.setTitle('KRAXX HQ │ SUPPORT & ASSISTANCE');

    let descText = 'Select a category below to open a private support ticket:\n\n';
    TICKET_CATEGORIES.forEach(cat => {
      descText += `${cat.emoji} **${cat.label}**\n• ${cat.description}\n\n`;
    });
    embed.setDescription(descText);

    if (bannerUrl) {
      embed.setImage(bannerUrl);
    }

    // Build 3 ActionRows with 5 buttons each (Discord limit per row is 5)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    TICKET_CATEGORIES.forEach((cat, index) => {
      const btn = new ButtonBuilder()
        .setCustomId(`kraxx_ticket_create:${cat.key}`)
        .setLabel(cat.label)
        .setStyle(cat.style);

      try {
        btn.setEmoji(cat.emoji);
      } catch {
        // Ignore invalid emoji
      }

      currentRow.addComponents(btn);

      if ((index + 1) % 5 === 0 || index === TICKET_CATEGORIES.length - 1) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder<ButtonBuilder>();
      }
    });

    await channel.send({ embeds: [embed], components: rows });

    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Support Panel Deployed', `Multi-category ticket panel established in ${channel}.`)],
      ephemeral: true,
    });
  }

  /**
   * Lists active ticket panels.
   */
  static async listTicketPanels(interaction: ChatInputCommandInteraction): Promise<void> {
    const panels = await TicketRepository.findAllPanels();

    if (panels.length === 0) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.createHeader('KRAXX HQ │ TICKET PANELS', 'TICKETS').setDescription('No ticket panels configured.')],
        ephemeral: true,
      });
      return;
    }

    const embed = KraxxEmbedBuilder.createHeader('ACTIVE TICKET PANELS', 'TICKETS');
    const lines = panels.map(
      p => `• **ID:** \`${p.id}\` │ **Title:** ${p.title} │ **Channel:** <#${p.channelId}> │ **Category:** \`${p.category}\``
    );
    embed.setDescription(lines.join('\n\n'));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /**
   * Deletes a ticket panel by ID.
   */
  static async deleteTicketPanel(interaction: ChatInputCommandInteraction, panelId: string): Promise<void> {
    const deleted = await TicketRepository.deletePanel(panelId);
    if (!deleted) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Not Found', `No panel found with ID \`${panelId}\`.`)],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Panel Deleted', `Ticket panel \`${panelId}\` removed.`)],
      ephemeral: true,
    });
  }

  /**
   * Finds or creates a Discord Category channel for open tickets.
   */
  private static async getOrCreateOpenCategory(guild: Guild, categoryKey: string): Promise<CategoryChannel | null> {
    const spec = TICKET_CATEGORIES.find(c => c.key === categoryKey);
    const categoryName = spec ? `----${spec.emoji} ${spec.label}----` : '----OPEN TICKETS----';

    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
    ) as CategoryChannel | undefined;

    if (!category) {
      try {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to create open ticket category channel');
        return null;
      }
    }
    return category;
  }

  /**
   * Finds or creates a Discord Category channel for closed tickets.
   */
  private static async getOrCreateClosedCategory(guild: Guild, categoryKey: string): Promise<CategoryChannel | null> {
    const spec = TICKET_CATEGORIES.find(c => c.key === categoryKey);
    const categoryName = spec ? `Closed:- ${spec.emoji} ${spec.label}` : 'Closed Tickets';

    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
    ) as CategoryChannel | undefined;

    if (!category) {
      try {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to create closed ticket category channel');
        return null;
      }
    }
    return category;
  }

  /**
   * Handles user clicking any "Create Ticket" category button.
   */
  static async handleCreateTicketButton(interaction: ButtonInteraction, categoryKey = 'GENERAL'): Promise<void> {
    const guild = interaction.guild;
    const member = interaction.member as GuildMember;

    if (!guild || !member) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Guild or member context missing.')],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const nextNum = await TicketRepository.getNextTicketNumber();
      const numStr = String(nextNum).padStart(4, '0');
      const channelName = `ticket-${numStr}`;

      const catSpec = TICKET_CATEGORIES.find(c => c.key === categoryKey);
      const displayCat = catSpec ? catSpec.label : categoryKey.toUpperCase();

      // Build channel permission overwrites
      const overwrites: any[] = [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ];

      if (interaction.client.user) {
        overwrites.push({
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles,
          ],
        });
      }

      if (env.MANAGEMENT_ROLE_ID && env.MANAGEMENT_ROLE_ID.trim().length > 0) {
        overwrites.push({
          id: env.MANAGEMENT_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      // Find or create category for this open ticket
      const openCategory = await this.getOrCreateOpenCategory(guild, categoryKey);

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: openCategory ? openCategory.id : undefined,
        permissionOverwrites: overwrites,
        topic: `KRAXX Support Ticket #${numStr} | Opener: ${member.user.tag} | Category: ${displayCat}`,
      });

      // Save ticket to DB
      await TicketRepository.createTicket({
        guildId: guild.id,
        channelId: ticketChannel.id,
        openerId: member.id,
        category: categoryKey,
        subject: `Support Ticket #${numStr} (${displayCat})`,
      });

      // Send Ticket Header in channel
      const headerEmbed = new KraxxEmbedBuilder();
      headerEmbed.setColor(KRAXX_COLORS.BRAND);
      headerEmbed.setTitle(`SUPPORT TICKET #${numStr} │ ${displayCat.toUpperCase()}`);
      headerEmbed.setDescription(
        `Welcome ${member}! Support team has been dispatched.\n\n` +
        `Please describe your issue or inquiry in detail so our team can assist you efficiently.`
      );

      headerEmbed.addFields(
        { name: 'Opened By', value: `<@${member.id}>`, inline: true },
        { name: 'Category', value: `\`${displayCat}\``, inline: true },
        { name: 'Status', value: '`OPEN`', inline: true }
      );

      const claimBtn = new ButtonBuilder()
        .setCustomId('kraxx_ticket_claim')
        .setLabel('Claim Ticket')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🖐️');

      const closeBtn = new ButtonBuilder()
        .setCustomId('kraxx_ticket_close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(claimBtn, closeBtn);

      await ticketChannel.send({
        content: `${member} <@&${env.MANAGEMENT_ROLE_ID || guild.ownerId}>`,
        embeds: [headerEmbed],
        components: [actionRow],
      });

      await interaction.editReply({
        embeds: [KraxxEmbedBuilder.success('Ticket Created', `Your support ticket has been created in ${ticketChannel}.`)],
      });

      logger.info({ opener: member.user.tag, ticketChannel: ticketChannel.name }, 'Ticket created');
    } catch (error) {
      logger.error({ err: error }, 'Failed to create ticket channel');
      await interaction.editReply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Failed to create ticket channel. Check bot permissions.')],
      });
    }
  }

  /**
   * Claims a support ticket for the executing user.
   */
  static async claimTicket(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const channelId = interaction.channelId;
    if (!channelId) return;

    const ticket = await TicketRepository.findByChannelId(channelId);
    if (!ticket) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'This command can only be executed inside an active ticket channel.')],
        ephemeral: true,
      });
      return;
    }

    if (ticket.status === 'CLOSED') {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Ticket Closed', 'This ticket is closed.')],
        ephemeral: true,
      });
      return;
    }

    const claimer = interaction.user;
    await TicketRepository.updateTicket(channelId, {
      status: 'CLAIMED',
      claimerId: claimer.id,
    });

    const embed = KraxxEmbedBuilder.success(
      'Ticket Claimed',
      `Ticket claimed by ${claimer}. They will handle your request.`
    );

    await interaction.reply({ embeds: [embed] });
    logger.info({ claimer: claimer.tag, ticketChannel: channelId }, 'Ticket claimed');
  }

  /**
   * Unclaims a support ticket.
   */
  static async unclaimTicket(interaction: ChatInputCommandInteraction): Promise<void> {
    const channelId = interaction.channelId;
    const ticket = await TicketRepository.findByChannelId(channelId);

    if (!ticket) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be run inside an active ticket channel.')],
        ephemeral: true,
      });
      return;
    }

    await TicketRepository.updateTicket(channelId, {
      status: 'OPEN',
      claimerId: null,
    });

    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Ticket Unclaimed', 'This ticket is no longer claimed and is open for staff.')],
    });
  }

  /**
   * Closes a support ticket: renames channel, moves down to closed category, revokes send permissions, posts transcript & controls.
   */
  static async closeTicket(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    reason?: string
  ): Promise<void> {
    const channelId = interaction.channelId;
    const channel = interaction.channel as TextChannel;
    const guild = interaction.guild;
    const ticket = await TicketRepository.findByChannelId(channelId);

    if (!ticket || !channel || !guild) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be run inside an active ticket channel.')],
        ephemeral: true,
      });
      return;
    }

    if (ticket.status === 'CLOSED') {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Already Closed', 'This ticket is already closed.')],
        ephemeral: true,
      });
      return;
    }

    await TicketRepository.updateTicket(channelId, {
      status: 'CLOSED',
      reason: reason || 'Closed by user or staff',
      closedAt: new Date(),
    });

    // 1. Rename channel to closed-XXXX
    const numStr = String(ticket.ticketNumber).padStart(4, '0');
    await channel.setName(`closed-${numStr}`).catch(() => {});

    // 2. Revoke send permissions for opener
    await channel.permissionOverwrites.edit(ticket.openerId, {
      SendMessages: false,
    }).catch(() => {});

    // 3. Move channel down to Closed Category
    const closedCategory = await this.getOrCreateClosedCategory(guild, ticket.category);
    if (closedCategory) {
      await channel.setParent(closedCategory.id, { lockPermissions: false }).catch(() => {});
    }

    // 4. Send Closed Header & Control Buttons
    const closeEmbed = new KraxxEmbedBuilder();
    closeEmbed.setColor(KRAXX_COLORS.WARNING);
    closeEmbed.setTitle(`TICKET CLOSED │ #${numStr}`);
    closeEmbed.setDescription(
      `Ticket Closed by <@${interaction.user.id}>\n${reason ? `**Reason:** ${reason}\n\n` : ''}` +
      `**Support Team Ticket Controls:**`
    );

    const transcriptBtn = new ButtonBuilder()
      .setCustomId('kraxx_ticket_transcript')
      .setLabel('Transcript')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📄');

    const reopenBtn = new ButtonBuilder()
      .setCustomId('kraxx_ticket_reopen')
      .setLabel('Open')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔓');

    const deleteBtn = new ButtonBuilder()
      .setCustomId('kraxx_ticket_delete')
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⛔');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(transcriptBtn, reopenBtn, deleteBtn);

    await interaction.reply({ embeds: [closeEmbed], components: [row] });

    // 5. Automatically generate and log transcript to #ticket-transcripts or bot log channel if configured
    this.postTranscriptLog(channel, ticket, interaction.user).catch(() => {});

    logger.info({ closer: interaction.user.tag, ticketNumber: ticket.ticketNumber }, 'Ticket closed & moved down');
  }

  /**
   * Reopens a closed support ticket.
   */
  static async reopenTicket(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const channelId = interaction.channelId;
    const channel = interaction.channel as TextChannel;
    const guild = interaction.guild;
    const ticket = await TicketRepository.findByChannelId(channelId);

    if (!ticket || !channel || !guild) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be run inside a ticket channel.')],
        ephemeral: true,
      });
      return;
    }

    const numStr = String(ticket.ticketNumber).padStart(4, '0');
    await TicketRepository.updateTicket(channelId, {
      status: 'OPEN',
      closedAt: null,
    });

    // Rename back to ticket-XXXX
    await channel.setName(`ticket-${numStr}`).catch(() => {});

    // Restore SendMessages permission for opener
    await channel.permissionOverwrites.edit(ticket.openerId, {
      SendMessages: true,
    }).catch(() => {});

    // Move back to Open Category
    const openCategory = await this.getOrCreateOpenCategory(guild, ticket.category);
    if (openCategory) {
      await channel.setParent(openCategory.id, { lockPermissions: false }).catch(() => {});
    }

    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Ticket Reopened', `Ticket #${numStr} has been reopened and moved back to active tickets.`)],
    });
  }

  /**
   * Deletes a ticket channel and database entry.
   */
  static async deleteTicketChannel(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const channelId = interaction.channelId;
    const channel = interaction.channel as TextChannel;
    const ticket = await TicketRepository.findByChannelId(channelId);

    if (!ticket || !channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be run inside a ticket channel.')],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Deleting Ticket', 'Deleting ticket channel in 5 seconds...')],
    });

    await TicketRepository.deleteTicket(channelId);

    setTimeout(async () => {
      await channel.delete('Ticket deleted').catch(() => {});
    }, 5000);
  }

  /**
   * Adds or removes a user from ticket channel permissions.
   */
  static async modifyTicketUser(
    interaction: ChatInputCommandInteraction,
    targetUser: User,
    action: 'add' | 'remove'
  ): Promise<void> {
    const channel = interaction.channel as TextChannel;
    const ticket = await TicketRepository.findByChannelId(channel.id);

    if (!ticket || !channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be run inside a ticket channel.')],
        ephemeral: true,
      });
      return;
    }

    if (action === 'add') {
      await channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.success('User Added', `Added ${targetUser} to ticket access.`)],
      });
    } else {
      await channel.permissionOverwrites.delete(targetUser.id);
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.success('User Removed', `Removed ${targetUser} from ticket access.`)],
      });
    }
  }

  /**
   * Generates a transcript of all messages in the ticket channel.
   */
  static async generateTranscript(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const channel = interaction.channel as TextChannel;
    const ticket = await TicketRepository.findByChannelId(channel.id);

    if (!ticket || !channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be run inside a ticket channel.')],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = Array.from(messages.values()).reverse();

    let transcriptText = `============================================================\n`;
    transcriptText += `KRAXX HQ SUPPORT TICKET TRANSCRIPT #${ticket.ticketNumber}\n`;
    transcriptText += `Subject: ${ticket.subject}\n`;
    transcriptText += `Category: ${ticket.category}\n`;
    transcriptText += `Opener ID: ${ticket.openerId}\n`;
    transcriptText += `Created: ${ticket.createdAt.toISOString()}\n`;
    transcriptText += `============================================================\n\n`;

    for (const m of sorted) {
      transcriptText += `[${m.createdAt.toISOString()}] ${m.author.tag} (${m.author.id}):\n${m.content || '[Embed/Attachment]'}\n\n`;
    }

    const buffer = Buffer.from(transcriptText, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-ticket-${ticket.ticketNumber}.txt` });

    await interaction.editReply({
      embeds: [KraxxEmbedBuilder.success('Transcript Generated', `Compiled ${sorted.length} messages.`)],
      files: [attachment],
    });
  }

  /**
   * Posts transcript to transcript log channel if configured.
   */
  private static async postTranscriptLog(channel: TextChannel, ticket: any, closedByUser: User): Promise<void> {
    const guild = channel.guild;
    const logChannel = guild.channels.cache.find(
      c => c.isTextBased() && (c.name.toLowerCase().includes('transcript') || c.name.toLowerCase().includes('ticket-log'))
    ) as TextChannel | undefined;

    if (!logChannel) return;

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) return;

    const sorted = Array.from(messages.values()).reverse();

    let transcriptText = `============================================================\n`;
    transcriptText += `KRAXX HQ SUPPORT TICKET TRANSCRIPT #${ticket.ticketNumber}\n`;
    transcriptText += `Subject: ${ticket.subject}\n`;
    transcriptText += `Category: ${ticket.category}\n`;
    transcriptText += `Opener ID: ${ticket.openerId}\n`;
    transcriptText += `Closed By: ${closedByUser.tag} (${closedByUser.id})\n`;
    transcriptText += `============================================================\n\n`;

    for (const m of sorted) {
      transcriptText += `[${m.createdAt.toISOString()}] ${m.author.tag} (${m.author.id}):\n${m.content || '[Embed/Attachment]'}\n\n`;
    }

    const buffer = Buffer.from(transcriptText, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-ticket-${ticket.ticketNumber}.txt` });

    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.SECURITY);
    embed.setTitle(`TRANSCRIPT LOG │ TICKET #${ticket.ticketNumber}`);
    embed.setDescription(`Transcript saved for ticket \`closed-${String(ticket.ticketNumber).padStart(4, '0')}\``);
    embed.addFields(
      { name: 'Opener', value: `<@${ticket.openerId}>`, inline: true },
      { name: 'Closed By', value: `<@${closedByUser.id}>`, inline: true },
      { name: 'Category', value: `\`${ticket.category}\``, inline: true }
    );

    await logChannel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
  }
}
