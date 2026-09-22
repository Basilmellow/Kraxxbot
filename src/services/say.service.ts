import {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  TextChannel,
  ColorResolvable,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Guild,
} from 'discord.js';
import { KraxxEmbedBuilder, KRAXX_COLORS } from '../embeds/kraxxEmbedBuilder';
import { logger } from '../utils/logger';

export class SayService {
  /**
   * Resolves plain text #channel, @user, and @role references into Discord mention format (<#id>, <@id>, <@&id>).
   */
  private static parseAndResolveMentions(message: string, guild?: Guild): string {
    if (!guild || !message) return message;

    let processed = message;

    // 1. Resolve #channel-name or #channel
    processed = processed.replace(/(?<!<)#([a-zA-Z0-9_-]+)/g, (match, channelName) => {
      const channel = guild.channels.cache.find(
        c => c.name.toLowerCase() === channelName.toLowerCase()
      );
      return channel ? `<#${channel.id}>` : match;
    });

    // 2. Resolve @user-or-role-name (ignoring @everyone and @here)
    processed = processed.replace(/(?<!<)@([a-zA-Z0-9._-]+)/g, (match, name) => {
      if (name.toLowerCase() === 'everyone' || name.toLowerCase() === 'here') {
        return match;
      }

      // Check member display name or username
      const member = guild.members.cache.find(
        m =>
          m.displayName.toLowerCase() === name.toLowerCase() ||
          m.user.username.toLowerCase() === name.toLowerCase()
      );
      if (member) {
        return `<@${member.id}>`;
      }

      // Check role name
      const role = guild.roles.cache.find(
        r => r.name.toLowerCase() === name.toLowerCase()
      );
      if (role) {
        return `<@&${role.id}>`;
      }

      return match;
    });

    return processed;
  }

  /**
   * Shows a multiline Paragraph Modal dialog for entering long formatted text.
   */
  static async openSayModal(
    interaction: ChatInputCommandInteraction,
    targetChannelId?: string
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(`kraxx_say_modal:${targetChannelId || ''}`)
      .setTitle('KRAXXBot │ Message Dispatch');

    const messageInput = new TextInputBuilder()
      .setCustomId('say_content')
      .setLabel('Message Content (#channel, @user, markdown)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Type or paste message here (e.g. Welcome to #welcome, ask @User)...')
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  /**
   * Dispatches a plain text message via the bot into a target channel.
   */
  static async sendSay(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    message: string,
    targetChannel?: TextChannel
  ): Promise<void> {
    const channel = (targetChannel || interaction.channel) as TextChannel;
    if (!channel || typeof channel.send !== 'function') {
      const errorEmbed = KraxxEmbedBuilder.error('Invalid Channel', 'The target channel is not a valid text channel.');
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
      return;
    }

    const formattedMessage = this.parseAndResolveMentions(message, interaction.guild || undefined);

    // Send message preserving all newlines, markdown, tags, and spaces
    await channel.send({ content: formattedMessage });

    const successEmbed = KraxxEmbedBuilder.success('Message Dispatched', `Message successfully sent to ${channel}.`);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }

    logger.info({ executor: interaction.user.tag, channel: channel.name }, 'Bot /say message dispatched');
  }

  /**
   * Dispatches a styled embed message via the bot into a target channel.
   */
  static async sendSayEmbed(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    title: string,
    description: string,
    colorHex?: string,
    targetChannel?: TextChannel
  ): Promise<void> {
    const channel = (targetChannel || interaction.channel) as TextChannel;
    if (!channel || typeof channel.send !== 'function') {
      const errorEmbed = KraxxEmbedBuilder.error('Invalid Channel', 'The target channel is not a valid text channel.');
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
      return;
    }

    let color: ColorResolvable = KRAXX_COLORS.BRAND;
    if (colorHex) {
      const cleanHex = colorHex.replace('#', '');
      const parsed = parseInt(cleanHex, 16);
      if (!isNaN(parsed)) {
        color = parsed;
      }
    }

    const formattedTitle = this.parseAndResolveMentions(title, interaction.guild || undefined);
    const formattedDesc = this.parseAndResolveMentions(description, interaction.guild || undefined);

    const embed = new KraxxEmbedBuilder();
    embed.setColor(color);
    embed.setTitle(formattedTitle);
    embed.setDescription(formattedDesc);

    await channel.send({ embeds: [embed] });

    const successEmbed = KraxxEmbedBuilder.success('Embed Dispatched', `Embed successfully sent to ${channel}.`);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }

    logger.info({ executor: interaction.user.tag, channel: channel.name }, 'Bot /sayembed dispatched');
  }

  /**
   * Edits a message previously sent by the bot.
   */
  static async editSay(
    interaction: ChatInputCommandInteraction,
    messageId: string,
    newContent: string
  ): Promise<void> {
    const channel = interaction.channel as TextChannel;
    if (!channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be executed within a text channel.')],
        ephemeral: true,
      });
      return;
    }

    try {
      const msg = await channel.messages.fetch(messageId);
      if (msg.author.id !== interaction.client.user?.id) {
        await interaction.reply({
          embeds: [KraxxEmbedBuilder.error('Permission Error', 'You can only edit messages sent by KRAXX Bot.')],
          ephemeral: true,
        });
        return;
      }

      const formattedContent = this.parseAndResolveMentions(newContent, interaction.guild || undefined);

      await msg.edit({ content: formattedContent });
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.success('Message Updated', `Message \`${messageId}\` updated successfully.`)],
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Message Not Found', `Could not find message \`${messageId}\` in this channel.`)],
        ephemeral: true,
      });
    }
  }

  /**
   * Replies to a specific message ID in the channel.
   */
  static async replySay(
    interaction: ChatInputCommandInteraction,
    messageId: string,
    replyContent: string
  ): Promise<void> {
    const channel = interaction.channel as TextChannel;
    if (!channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be executed within a text channel.')],
        ephemeral: true,
      });
      return;
    }

    try {
      const targetMsg = await channel.messages.fetch(messageId);
      const formattedContent = this.parseAndResolveMentions(replyContent, interaction.guild || undefined);

      await targetMsg.reply({ content: formattedContent });
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.success('Reply Dispatched', `Replied to message \`${messageId}\` successfully.`)],
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Message Not Found', `Could not find message \`${messageId}\` to reply to.`)],
        ephemeral: true,
      });
    }
  }

  /**
   * Pins/keeps a message sent by the bot in the channel.
   */
  static async keepSay(
    interaction: ChatInputCommandInteraction,
    messageId: string
  ): Promise<void> {
    const channel = interaction.channel as TextChannel;
    if (!channel) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Error', 'Command must be executed within a text channel.')],
        ephemeral: true,
      });
      return;
    }

    try {
      const msg = await channel.messages.fetch(messageId);
      await msg.pin();
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.success('Message Pinned', `Message \`${messageId}\` has been pinned and kept.`)],
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Pin Failed', `Could not find or pin message \`${messageId}\`.`)],
        ephemeral: true,
      });
    }
  }
}
