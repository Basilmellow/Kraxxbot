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
import { GuildRepository } from '../database/repositories/guild.repository';
import { KraxxEmbedBuilder, KRAXX_COLORS } from '../embeds/kraxxEmbedBuilder';
import { isTicketManager } from '../config/roles';
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

export class TicketService {
  /**
   * Helper to perform server-side permission check for ticket management actions.
   */
  public static verifyTicketManager(member: GuildMember): boolean {
    return isTicketManager(member);
  }

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
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

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
      guildId: interaction.guildId!,
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
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

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
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

    const panels = await TicketRepository.findPanelsByGuild(interaction.guildId!);

    if (panels.length === 0) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.createHeader('KRAXX HQ │ TICKET PANELS', 'TICKETS').setDescription('No ticket panels configured.')],
        ephemeral: true,
      });
      return;
    }

    const embed = KraxxEmbedBuilder.createHeader('ACTIVE TICKET PANELS', 'TICKETS');
    const lines = panels.map(
      (p: any) => `• **ID:** \`${p.id}\` │ **Title:** ${p.title} │ **Channel:** <#${p.channelId}> │ **Category:** \`${p.category}\``
    );
    embed.setDescription(lines.join('\n\n'));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /**
   * Deletes a ticket panel by ID.
   */
  static async deleteTicketPanel(interaction: ChatInputCommandInteraction, panelId: string): Promise<void> {
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

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
   * Finds or creates the dedicated management-only TICKET-TRANSCRIPTS category and #ticket-transcripts channel.
   */
  private static async getOrCreateTranscriptChannel(guild: Guild): Promise<TextChannel | null> {
    const guildData = await GuildRepository.findById(guild.id);
    const transcriptChannelId = guildData?.settings?.ticketTranscriptsChannelId;

    // 1. Check if ticketTranscriptsChannelId is set and exists
    if (transcriptChannelId && transcriptChannelId.trim().length > 0) {
      const existing = guild.channels.cache.get(transcriptChannelId.trim()) as TextChannel | undefined;
      if (existing && existing.isTextBased()) return existing;
    }

    // 2. Find or create TICKET-TRANSCRIPTS category
    let transcriptCategory = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === 'TICKET-TRANSCRIPTS'
    ) as CategoryChannel | undefined;

    const mgmtRoles = [
      guildData?.settings?.adminRoleId,
      guildData?.settings?.modRoleId,
      guildData?.settings?.supportRoleId,
    ].filter((id): id is string => Boolean(id && id.trim().length > 0));

    const categoryOverwrites: any[] = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
    ];

    if (guild.client.user) {
      categoryOverwrites.push({
        id: guild.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageChannels,
        ],
      });
    }

    for (const rId of mgmtRoles) {
      categoryOverwrites.push({
        id: rId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    if (!transcriptCategory) {
      try {
        transcriptCategory = await guild.channels.create({
          name: 'TICKET-TRANSCRIPTS',
          type: ChannelType.GuildCategory,
          permissionOverwrites: categoryOverwrites,
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to create TICKET-TRANSCRIPTS category channel');
      }
    }

    // 3. Find or create #ticket-transcripts channel
    let transcriptChannel = guild.channels.cache.find(
      c => c.type === ChannelType.GuildText && c.name.toLowerCase() === 'ticket-transcripts'
    ) as TextChannel | undefined;

    if (!transcriptChannel) {
      try {
        transcriptChannel = await guild.channels.create({
          name: 'ticket-transcripts',
          type: ChannelType.GuildText,
          parent: transcriptCategory ? transcriptCategory.id : undefined,
          permissionOverwrites: categoryOverwrites,
          topic: 'KRAXX HQ Archive │ Restricted Support Ticket Transcripts',
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to create #ticket-transcripts channel');
        return null;
      }
    }

    return transcriptChannel;
  }

  /**
   * Finds or creates the dedicated management-only TICKET-LOGS channel.
   */
  private static async getOrCreateTicketLogChannel(guild: Guild): Promise<TextChannel | null> {
    const guildData = await GuildRepository.findById(guild.id);
    const ticketLogId = guildData?.settings?.ticketLogsChannelId || guildData?.settings?.logChannelId;

    if (ticketLogId && ticketLogId.trim().length > 0) {
      const existing = guild.channels.cache.get(ticketLogId.trim()) as TextChannel | undefined;
      if (existing && existing.isTextBased()) return existing;
    }

    let logCategory = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === 'TICKET-LOGS'
    ) as CategoryChannel | undefined;

    const mgmtRoles = [
      guildData?.settings?.adminRoleId,
      guildData?.settings?.modRoleId,
      guildData?.settings?.supportRoleId,
    ].filter((id): id is string => Boolean(id && id.trim().length > 0));

    const categoryOverwrites: any[] = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
    ];

    if (guild.client.user) {
      categoryOverwrites.push({
        id: guild.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageChannels,
        ],
      });
    }

    for (const rId of mgmtRoles) {
      categoryOverwrites.push({
        id: rId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    if (!logCategory) {
      try {
        logCategory = await guild.channels.create({
          name: 'TICKET-LOGS',
          type: ChannelType.GuildCategory,
          permissionOverwrites: categoryOverwrites,
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to create TICKET-LOGS category channel');
      }
    }

    let logChannel = guild.channels.cache.find(
      c => c.type === ChannelType.GuildText && c.name.toLowerCase() === 'ticket-logs'
    ) as TextChannel | undefined;

    if (!logChannel) {
      try {
        logChannel = await guild.channels.create({
          name: 'ticket-logs',
          type: ChannelType.GuildText,
          parent: logCategory ? logCategory.id : undefined,
          permissionOverwrites: categoryOverwrites,
          topic: 'KRAXX HQ Audit │ Support Ticket System Event Logs',
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to create #ticket-logs channel');
        return null;
      }
    }

    return logChannel;
  }

  /**
   * Sends audit/event log embeds to #ticket-logs.
   */
  private static async postTicketLog(guild: Guild, embed: KraxxEmbedBuilder): Promise<void> {
    try {
      const logChannel = await this.getOrCreateTicketLogChannel(guild);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to post ticket log entry');
    }
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
      const nextNum = await TicketRepository.getNextTicketNumber(guild.id);
      const numStr = String(nextNum).padStart(4, '0');
      const channelName = `ticket-${numStr}`;

      const catSpec = TICKET_CATEGORIES.find(c => c.key === categoryKey);
      const displayCat = catSpec ? catSpec.label : categoryKey.toUpperCase();

      // Build strictly scoped permission overwrites
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
            PermissionFlagsBits.EmbedLinks,
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

      const guildData = await GuildRepository.findById(guild.id);
      const mgmtRoleIds = [
        guildData?.settings?.adminRoleId,
        guildData?.settings?.modRoleId,
        guildData?.settings?.supportRoleId,
        guildData?.settings?.staffRoleId,
      ].filter((id): id is string => Boolean(id && id.trim().length > 0));

      for (const rId of mgmtRoleIds) {
        overwrites.push({
          id: rId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
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

      const pingMention = mgmtRoleIds.length > 0 ? mgmtRoleIds.map(id => `<@&${id}>`).join(' ') : `<@${guild.ownerId}>`;

      await ticketChannel.send({
        content: `${member} ${pingMention}`,
        embeds: [headerEmbed],
        components: [actionRow],
      });

      await interaction.editReply({
        embeds: [KraxxEmbedBuilder.success('Ticket Created', `Your support ticket has been created in ${ticketChannel}.`)],
      });

      // Log event
      const logEmbed = new KraxxEmbedBuilder();
      logEmbed.setColor(KRAXX_COLORS.BRAND);
      logEmbed.setTitle(`TICKET EVENT │ CREATED #${numStr}`);
      logEmbed.setDescription(`Ticket channel ${ticketChannel} created by ${member}.`);
      logEmbed.addFields(
        { name: 'Ticket Number', value: `#${numStr}`, inline: true },
        { name: 'Opener', value: `<@${member.id}>`, inline: true },
        { name: 'Category', value: `\`${displayCat}\``, inline: true }
      );
      this.postTicketLog(guild, logEmbed).catch(() => {});

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
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.channelId;
    if (!channelId) return;

    const ticket = await TicketRepository.findByChannelId(channelId);
    if (!ticket) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'This ticket no longer exists or has already been removed.')],
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

    if (interaction.guild) {
      const logEmbed = new KraxxEmbedBuilder();
      logEmbed.setColor(KRAXX_COLORS.NEUTRAL);
      logEmbed.setTitle(`TICKET EVENT │ CLAIMED #${ticket.ticketNumber}`);
      logEmbed.setDescription(`Ticket #${ticket.ticketNumber} claimed by ${claimer}.`);
      logEmbed.addFields(
        { name: 'Claimer', value: `<@${claimer.id}>`, inline: true },
        { name: 'Opener', value: `<@${ticket.openerId}>`, inline: true }
      );
      this.postTicketLog(interaction.guild, logEmbed).catch(() => {});
    }

    logger.info({ claimer: claimer.tag, ticketChannel: channelId }, 'Ticket claimed');
  }

  /**
   * Unclaims a support ticket.
   */
  static async unclaimTicket(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.channelId;
    const ticket = await TicketRepository.findByChannelId(channelId);

    if (!ticket) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'This ticket no longer exists or has already been removed.')],
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

    if (interaction.guild) {
      const logEmbed = new KraxxEmbedBuilder();
      logEmbed.setColor(KRAXX_COLORS.WARNING);
      logEmbed.setTitle(`TICKET EVENT │ UNCLAIMED #${ticket.ticketNumber}`);
      logEmbed.setDescription(`Ticket #${ticket.ticketNumber} unclaimed by <@${interaction.user.id}>.`);
      this.postTicketLog(interaction.guild, logEmbed).catch(() => {});
    }
  }

  /**
   * Closes a support ticket: renames channel, moves down to closed category, revokes send permissions, archives transcript & posts controls.
   */
  static async closeTicket(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    reason?: string
  ): Promise<void> {
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

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
      closedById: interaction.user.id,
      reason: reason || 'Closed by KRAXX Management',
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

    // 5. Automatically generate and archive transcript to #ticket-transcripts in TICKET-TRANSCRIPTS category
    this.archiveTranscript(channel, ticket, interaction.user).catch(err => {
      logger.error({ err }, 'Failed to archive transcript during ticket close');
    });

    // 6. Log closure event
    const logEmbed = new KraxxEmbedBuilder();
    logEmbed.setColor(KRAXX_COLORS.WARNING);
    logEmbed.setTitle(`TICKET EVENT │ CLOSED #${numStr}`);
    logEmbed.setDescription(`Ticket #${numStr} closed by <@${interaction.user.id}>.`);
    logEmbed.addFields(
      { name: 'Opener', value: `<@${ticket.openerId}>`, inline: true },
      { name: 'Reason', value: reason || 'N/A', inline: true }
    );
    this.postTicketLog(guild, logEmbed).catch(() => {});

    logger.info({ closer: interaction.user.tag, ticketNumber: ticket.ticketNumber }, 'Ticket closed & transcript archived');
  }

  /**
   * Reopens a closed support ticket.
   */
  static async reopenTicket(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

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
      closedById: null,
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

    const logEmbed = new KraxxEmbedBuilder();
    logEmbed.setColor(KRAXX_COLORS.SECURITY);
    logEmbed.setTitle(`TICKET EVENT │ REOPENED #${numStr}`);
    logEmbed.setDescription(`Ticket #${numStr} reopened by <@${interaction.user.id}>.`);
    this.postTicketLog(guild, logEmbed).catch(() => {});
  }

  /**
   * Deletes a ticket channel and database entry, then cleans up empty dynamic categories safely.
   */
  static async deleteTicketChannel(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

    const channelId = interaction.channelId;
    const channel = interaction.channel as TextChannel;
    const guild = interaction.guild;
    const ticket = await TicketRepository.findByChannelId(channelId);

    if (!ticket || !channel || !guild) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'This ticket no longer exists or has already been removed.')],
        ephemeral: true,
      });
      return;
    }

    const parentCategory = channel.parent as CategoryChannel | null;
    const parentCategoryId = parentCategory ? parentCategory.id : null;
    const parentCategoryName = parentCategory ? parentCategory.name : null;

    await interaction.reply({
      embeds: [KraxxEmbedBuilder.success('Deleting Ticket', 'Deleting ticket channel in 5 seconds...')],
    });

    // Log deletion
    const numStr = String(ticket.ticketNumber).padStart(4, '0');
    const logEmbed = new KraxxEmbedBuilder();
    logEmbed.setColor(KRAXX_COLORS.DANGER);
    logEmbed.setTitle(`TICKET EVENT │ DELETED #${numStr}`);
    logEmbed.setDescription(`Ticket channel \`${channel.name}\` deleted by <@${interaction.user.id}>.`);
    logEmbed.addFields(
      { name: 'Opener', value: `<@${ticket.openerId}>`, inline: true },
      { name: 'Category', value: `\`${ticket.category}\``, inline: true }
    );
    this.postTicketLog(guild, logEmbed).catch(() => {});

    await TicketRepository.deleteTicket(channelId);

    setTimeout(async () => {
      try {
        await channel.delete('Ticket deleted');
        
        // Clean up empty category if no channels remain
        if (parentCategoryId && parentCategoryName) {
          await TicketService.cleanupEmptyTicketCategory(guild, parentCategoryId, parentCategoryName);
        }
      } catch (err) {
        logger.error({ err }, 'Failed deleting channel or cleaning category');
      }
    }, 5000);
  }

  /**
   * Safely checks and cleans up empty dynamic ticket categories.
   */
  private static async cleanupEmptyTicketCategory(guild: Guild, categoryId: string, categoryName: string): Promise<void> {
    try {
      const category = guild.channels.cache.get(categoryId) as CategoryChannel | undefined;
      if (!category || category.type !== ChannelType.GuildCategory) return;

      const lowerName = categoryName.toLowerCase();

      // Check permanent category whitelist safety
      if (PERMANENT_CATEGORIES_WHITELIST.some(w => lowerName.includes(w))) {
        return;
      }

      // Confirm it is a dynamically created ticket category (starts with ---- or Closed:-)
      const isDynamic = categoryName.startsWith('----') || categoryName.startsWith('Closed:-');
      if (!isDynamic) return;

      // Re-fetch channel children in guild cache
      const remainingChildren = guild.channels.cache.filter(c => c.parentId === categoryId);
      if (remainingChildren.size === 0) {
        await category.delete('Dynamic empty ticket category cleanup');

        const logEmbed = new KraxxEmbedBuilder();
        logEmbed.setColor(KRAXX_COLORS.NEUTRAL);
        logEmbed.setTitle('CATEGORY CLEANUP │ DYNAMIC CATEGORY REMOVED');
        logEmbed.setDescription(`Empty dynamic ticket category \`${categoryName}\` was automatically deleted.`);
        this.postTicketLog(guild, logEmbed).catch(() => {});

        logger.info({ categoryName }, 'Empty dynamic ticket category automatically deleted');
      }
    } catch (err) {
      logger.warn({ err, categoryId, categoryName }, 'Failed to cleanup empty category');
    }
  }

  /**
   * Adds or removes a user from ticket channel permissions.
   */
  static async modifyTicketUser(
    interaction: ChatInputCommandInteraction,
    targetUser: User,
    action: 'add' | 'remove'
  ): Promise<void> {
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const ticket = await TicketRepository.findByChannelId(channel.id);

    if (!ticket || !channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be run inside an active ticket channel.')],
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
        embeds: [KraxxEmbedBuilder.success('User Added', `Added ${targetUser} to ticket access.`)],
      });
    } else {
      await channel.permissionOverwrites.delete(targetUser.id);
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.success('User Removed', `Removed ${targetUser} from ticket access.`)],
      });
    }

    if (interaction.guild) {
      const logEmbed = new KraxxEmbedBuilder();
      logEmbed.setColor(KRAXX_COLORS.NEUTRAL);
      logEmbed.setTitle(`TICKET EVENT │ USER ${action.toUpperCase()}ED #${ticket.ticketNumber}`);
      logEmbed.setDescription(`User ${targetUser} was ${action}ed to/from ticket \`${channel.name}\` by <@${interaction.user.id}>.`);
      this.postTicketLog(interaction.guild, logEmbed).catch(() => {});
    }
  }

  /**
   * Generates a transcript of all messages in the ticket channel.
   */
  static async generateTranscript(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<void> {
    const member = interaction.member as GuildMember;
    if (!this.verifyTicketManager(member)) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', 'This action is restricted to KRAXX Management.')],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const ticket = await TicketRepository.findByChannelId(channel.id);

    if (!ticket || !channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be run inside a ticket channel.')],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = Array.from(messages.values()).reverse();

    let transcriptText = `============================================================\n`;
    transcriptText += `KRAXX HQ SUPPORT TICKET TRANSCRIPT #${ticket.ticketNumber}\n`;
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
    const attachment = new AttachmentBuilder(buffer, { name: `transcript-ticket-${ticket.ticketNumber}.txt` });

    await interaction.editReply({
      embeds: [KraxxEmbedBuilder.success('Transcript Generated', `Compiled ${sorted.length} messages. Saved to management archives.`)],
      files: [attachment],
    });

    if (interaction.guild) {
      await this.archiveTranscript(channel, ticket, interaction.user);
    }
  }

  /**
   * Archives transcript .txt and rich embed to the dedicated management-only #ticket-transcripts channel.
   */
  private static async archiveTranscript(channel: TextChannel, ticket: any, closedByUser: User): Promise<void> {
    const guild = channel.guild;
    const transcriptChannel = await this.getOrCreateTranscriptChannel(guild);

    if (!transcriptChannel) {
      logger.warn('Unable to locate or create #ticket-transcripts channel for archiving');
      return;
    }

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) return;

    const sorted = Array.from(messages.values()).reverse();

    let transcriptText = `============================================================\n`;
    transcriptText += `KRAXX HQ SUPPORT TICKET TRANSCRIPT #${ticket.ticketNumber}\n`;
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
    const attachment = new AttachmentBuilder(buffer, { name: filename });

    const numStr = String(ticket.ticketNumber).padStart(4, '0');
    const embed = new KraxxEmbedBuilder();
    embed.setColor(KRAXX_COLORS.SECURITY);
    embed.setTitle(`TRANSCRIPT ARCHIVE │ TICKET #${numStr}`);
    embed.setDescription(`Official transcript record archived for ticket \`ticket-${numStr}\`.`);

    embed.addFields(
      { name: 'Ticket ID', value: `\`${ticket.id}\``, inline: true },
      { name: 'Ticket Creator', value: `<@${ticket.openerId}>`, inline: true },
      { name: 'Category', value: `\`${ticket.category}\``, inline: true },
      { name: 'Claimed By', value: ticket.claimerId ? `<@${ticket.claimerId}>` : '`Unclaimed`', inline: true },
      { name: 'Created At', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:f>`, inline: true },
      { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
      { name: 'Closed By', value: `<@${closedByUser.id}>`, inline: true },
      { name: 'Ticket Status', value: '`CLOSED`', inline: true }
    );

    const archiveMsg = await transcriptChannel.send({ embeds: [embed], files: [attachment] }).catch(() => null);

    if (archiveMsg && archiveMsg.attachments.first()) {
      const url = archiveMsg.attachments.first()?.url;
      if (url) {
        await TicketRepository.updateTicket(channel.id, { transcriptUrl: url }).catch(() => {});
      }
    }
  }
}
