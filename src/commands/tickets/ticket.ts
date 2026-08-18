import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, TextChannel, User, GuildMember } from 'discord.js';
import { TicketService } from '../../services/ticket.service';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Comprehensive support ticket system')

    // /ticket panel setup
    .addSubcommandGroup(group =>
      group
        .setName('panel')
        .setDescription('Ticket panel management commands')
        .addSubcommand(sub =>
          sub
            .setName('setup')
            .setDescription('Spawn a support ticket creation panel in a channel (Management Only)')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('Target text channel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
            )
            .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(false))
            .addStringOption(opt => opt.setName('description').setDescription('Panel main description').setRequired(false))
            .addStringOption(opt => opt.setName('category').setDescription('Support category (e.g. GENERAL, SECURITY)').setRequired(false))
        )
        .addSubcommand(sub =>
          sub
            .setName('preset')
            .setDescription('Deploy complete multi-category support ticket panel with all category buttons')
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('Target text channel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
            )
            .addStringOption(opt => opt.setName('banner_url').setDescription('Optional image banner URL').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('list').setDescription('List active support ticket panels'))
        .addSubcommand(sub =>
          sub
            .setName('delete')
            .setDescription('Delete a ticket panel by ID (Management Only)')
            .addStringOption(opt => opt.setName('panel_id').setDescription('Panel ID to delete').setRequired(true))
        )
    )

    // /ticket claim
    .addSubcommand(sub => sub.setName('claim').setDescription('Claim responsibility for the current support ticket'))

    // /ticket unclaim
    .addSubcommand(sub => sub.setName('unclaim').setDescription('Unclaim responsibility for the current support ticket'))

    // /ticket close
    .addSubcommand(sub =>
      sub
        .setName('close')
        .setDescription('Close the current support ticket')
        .addStringOption(opt => opt.setName('reason').setDescription('Optional closing reason').setRequired(false))
    )

    // /ticket reopen
    .addSubcommand(sub => sub.setName('reopen').setDescription('Reopen a closed support ticket'))

    // /ticket delete
    .addSubcommand(sub => sub.setName('delete').setDescription('Delete the current ticket channel and purge data'))

    // /ticket user add / remove
    .addSubcommand(sub =>
      sub
        .setName('user')
        .setDescription('Add or remove a user to/from ticket channel permissions')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' })
        )
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    )

    // /ticket transcript
    .addSubcommand(sub => sub.setName('transcript').setDescription('Generate a message history transcript for the ticket')),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();
    const member = interaction.member as GuildMember;

    // Enforce Ticket Manager authorization for all management commands
    const auth = PermissionsService.requireTicketManager(member);

    // Group: /ticket panel ...
    if (group === 'panel') {
      if (!auth.authorized) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'You do not have permission to manage tickets.')],
          ephemeral: true,
        });
        return;
      }

      if (subcommand === 'list') {
        await TicketService.listTicketPanels(interaction);
        return;
      }

      if (subcommand === 'setup') {
        const targetChannel = interaction.options.getChannel('channel') as TextChannel | undefined;
        const title = interaction.options.getString('title') || undefined;
        const description = interaction.options.getString('description') || undefined;
        const category = interaction.options.getString('category') || undefined;

        await TicketService.setupTicketPanel(interaction, targetChannel || undefined, title, description, category);
        return;
      }

      if (subcommand === 'preset') {
        const targetChannel = interaction.options.getChannel('channel') as TextChannel | undefined;
        const bannerUrl = interaction.options.getString('banner_url') || undefined;
        await TicketService.setupMultiCategoryPanel(interaction, targetChannel || undefined, bannerUrl);
        return;
      }

      if (subcommand === 'delete') {
        const panelId = interaction.options.getString('panel_id', true);
        await TicketService.deleteTicketPanel(interaction, panelId);
        return;
      }
    }

    // Direct Subcommands: Require Ticket Manager authorization
    if (!auth.authorized) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'You do not have permission to manage tickets.')],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'claim') {
      await TicketService.claimTicket(interaction);
      return;
    }

    if (subcommand === 'unclaim') {
      await TicketService.unclaimTicket(interaction);
      return;
    }

    if (subcommand === 'close') {
      const reason = interaction.options.getString('reason') || undefined;
      await TicketService.closeTicket(interaction, reason);
      return;
    }

    if (subcommand === 'reopen') {
      await TicketService.reopenTicket(interaction);
      return;
    }

    if (subcommand === 'delete') {
      await TicketService.deleteTicketChannel(interaction);
      return;
    }

    if (subcommand === 'user') {
      const action = interaction.options.getString('action', true) as 'add' | 'remove';
      const targetUser = interaction.options.getUser('user', true) as User;
      await TicketService.modifyTicketUser(interaction, targetUser, action);
      return;
    }

    if (subcommand === 'transcript') {
      await TicketService.generateTranscript(interaction);
      return;
    }
  },
};
