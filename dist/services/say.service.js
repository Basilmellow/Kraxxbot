"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SayService = void 0;
const discord_js_1 = require("discord.js");
const kraxxEmbedBuilder_1 = require("../embeds/kraxxEmbedBuilder");
const logger_1 = require("../utils/logger");
const message_operation_service_1 = require("./message-operation.service");
const policy_1 = require("../security/policy");
const permissions_service_1 = require("./permissions.service");
class SayService {
    static async executeOperation(interaction, channel, operationType, content, embeds, targetMessageId) {
        const guild = interaction.guild;
        if (!guild || channel.guildId !== guild.id)
            throw new policy_1.PolicyError('Target channel must belong to this server.');
        const member = interaction.member;
        if (!permissions_service_1.PermissionsService.requireTeamLead(member).authorized)
            throw new policy_1.PolicyError('Insufficient permission to manage messages.');
        let targetMessage;
        const adapter = {
            async authorize() {
                const bot = guild.members.me;
                const permissions = bot && channel.permissionsFor(bot);
                if (!permissions?.has(discord_js_1.PermissionFlagsBits.ViewChannel))
                    throw new policy_1.PolicyError('KRAXXBot cannot view this channel.');
                if (operationType === 'PIN') {
                    if (!permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages))
                        throw new policy_1.PolicyError('KRAXXBot lacks Manage Messages permission.');
                }
                else if (!permissions.has(discord_js_1.PermissionFlagsBits.SendMessages) || (embeds?.length && !permissions.has(discord_js_1.PermissionFlagsBits.EmbedLinks))) {
                    throw new policy_1.PolicyError('KRAXXBot lacks channel permissions.');
                }
                if (operationType === 'EDIT' || operationType === 'REPLY' || operationType === 'PIN') {
                    targetMessage = await channel.messages.fetch(targetMessageId);
                    if (operationType === 'EDIT' && targetMessage.author.id !== interaction.client.user?.id)
                        throw new policy_1.PolicyError('Only KRAXXBot messages can be edited.');
                }
            },
            async send(args) {
                const sent = await channel.send({ content: args.content, embeds: args.embeds, allowedMentions: args.allowedMentions,
                    nonce: args.nonce, enforceNonce: true,
                    ...(args.replyToMessageId ? { reply: { messageReference: args.replyToMessageId, failIfNotExists: true } } : {}) });
                return { messageId: sent.id };
            },
            async edit(args) {
                if (!targetMessage || targetMessage.id !== args.messageId)
                    throw new policy_1.PolicyError('Message is not available in this channel.');
                const edited = await targetMessage.edit({ content: args.content, embeds: args.embeds, allowedMentions: args.allowedMentions });
                return { messageId: edited.id };
            },
            async pin(args) {
                if (!targetMessage || targetMessage.id !== args.messageId)
                    throw new policy_1.PolicyError('Message is not available in this channel.');
                await targetMessage.pin();
            },
            async delete() { throw new policy_1.PolicyError('Delete is not enabled for this command.'); },
        };
        return message_operation_service_1.MessageOperationService.execute({ guildId: guild.id, actorId: interaction.user.id, source: 'BOT', operationType,
            idempotencyKey: interaction.id, channelId: channel.id, ...(targetMessageId ? { targetMessageId } : {}),
            ...(content !== undefined ? { content } : {}), ...(embeds ? { embeds } : {}), mentionMode: 'NONE' }, adapter);
    }
    /**
     * Resolves plain text #channel, @user, and @role references into Discord mention format (<#id>, <@id>, <@&id>).
     */
    static parseAndResolveMentions(message, guild) {
        if (!guild || !message)
            return message;
        let processed = message;
        // 1. Resolve #channel-name or #channel
        processed = processed.replace(/(?<!<)#([a-zA-Z0-9_-]+)/g, (match, channelName) => {
            const channel = guild.channels.cache.find(c => c.name.toLowerCase() === channelName.toLowerCase());
            return channel ? `<#${channel.id}>` : match;
        });
        // 2. Resolve @user-or-role-name (ignoring @everyone and @here)
        processed = processed.replace(/(?<!<)@([a-zA-Z0-9._-]+)/g, (match, name) => {
            if (name.toLowerCase() === 'everyone' || name.toLowerCase() === 'here') {
                return match;
            }
            // Check member display name or username
            const member = guild.members.cache.find(m => m.displayName.toLowerCase() === name.toLowerCase() ||
                m.user.username.toLowerCase() === name.toLowerCase());
            if (member) {
                return `<@${member.id}>`;
            }
            // Check role name
            const role = guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
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
    static async openSayModal(interaction, targetChannelId) {
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId(`kraxx_say_modal:${targetChannelId || ''}`)
            .setTitle('KRAXXBot │ Message Dispatch');
        const messageInput = new discord_js_1.TextInputBuilder()
            .setCustomId('say_content')
            .setLabel('Message Content (#channel, @user, markdown)')
            .setStyle(discord_js_1.TextInputStyle.Paragraph)
            .setPlaceholder('Type or paste message here (e.g. Welcome to #welcome, ask @User)...')
            .setRequired(true);
        const row = new discord_js_1.ActionRowBuilder().addComponents(messageInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }
    /**
     * Dispatches a plain text message via the bot into a target channel.
     */
    static async sendSay(interaction, message, targetChannel) {
        const channel = (targetChannel || interaction.channel);
        if (!channel || typeof channel.send !== 'function') {
            const errorEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Channel', 'The target channel is not a valid text channel.');
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            }
            else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            return;
        }
        const formattedMessage = this.parseAndResolveMentions(message, interaction.guild || undefined);
        const result = await this.executeOperation(interaction, channel, 'SEND', formattedMessage, undefined);
        const successEmbed = result.status === 'SUCCESS'
            ? kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Message Dispatched', `Message sent to ${channel}.`)
            : kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Message State ' + result.status, result.status === 'UNKNOWN' || result.status === 'PENDING'
                ? 'Discord may have accepted this message, but KRAXXBot could not confirm it. Do not retry with a new operation key.'
                : `Discord rejected this request (${result.errorCode || 'MESSAGE_FAILED'}).`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
        }
        else {
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }
        if (result.status === 'SUCCESS')
            logger_1.logger.info({ executor: interaction.user.tag, channel: channel.name }, 'Bot /say message dispatched');
        else
            logger_1.logger.warn({ executor: interaction.user.tag, channel: channel.name, operationId: result.operationId, status: result.status }, 'Bot /say result requires verification');
    }
    /**
     * Dispatches a styled embed message via the bot into a target channel.
     */
    static async sendSayEmbed(interaction, title, description, colorHex, targetChannel) {
        const channel = (targetChannel || interaction.channel);
        if (!channel || typeof channel.send !== 'function') {
            const errorEmbed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Invalid Channel', 'The target channel is not a valid text channel.');
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            }
            else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            return;
        }
        let color = kraxxEmbedBuilder_1.KRAXX_COLORS.BRAND;
        if (colorHex) {
            const cleanHex = colorHex.replace('#', '');
            const parsed = parseInt(cleanHex, 16);
            if (!isNaN(parsed)) {
                color = parsed;
            }
        }
        const formattedTitle = this.parseAndResolveMentions(title, interaction.guild || undefined);
        const formattedDesc = this.parseAndResolveMentions(description, interaction.guild || undefined);
        const embed = new kraxxEmbedBuilder_1.KraxxEmbedBuilder();
        embed.setColor(color);
        embed.setTitle(formattedTitle);
        embed.setDescription(formattedDesc);
        const result = await this.executeOperation(interaction, channel, 'SEND', undefined, [embed.toJSON()]);
        const successEmbed = result.status === 'SUCCESS'
            ? kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Embed Dispatched', `Embed sent to ${channel}.`)
            : kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Message State ' + result.status, result.status === 'UNKNOWN' || result.status === 'PENDING'
                ? 'Discord may have accepted this embed, but KRAXXBot could not confirm it. Do not retry with a new operation key.'
                : `Discord rejected this request (${result.errorCode || 'MESSAGE_FAILED'}).`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
        }
        else {
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }
        if (result.status === 'SUCCESS')
            logger_1.logger.info({ executor: interaction.user.tag, channel: channel.name }, 'Bot /sayembed dispatched');
        else
            logger_1.logger.warn({ executor: interaction.user.tag, channel: channel.name, operationId: result.operationId, status: result.status }, 'Bot /sayembed result requires verification');
    }
    /**
     * Edits a message previously sent by the bot.
     */
    static async editSay(interaction, messageId, newContent) {
        const channel = interaction.channel;
        if (!channel) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Command must be executed within a text channel.')],
                ephemeral: true,
            });
            return;
        }
        try {
            const msg = await channel.messages.fetch(messageId);
            if (msg.author.id !== interaction.client.user?.id) {
                await interaction.reply({
                    embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Permission Error', 'You can only edit messages sent by KRAXX Bot.')],
                    ephemeral: true,
                });
                return;
            }
            const formattedContent = this.parseAndResolveMentions(newContent, interaction.guild || undefined);
            const result = await this.executeOperation(interaction, channel, 'EDIT', formattedContent, undefined, messageId);
            await interaction.reply({
                embeds: [result.status === 'SUCCESS'
                        ? kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Message Updated', `Message \`${messageId}\` updated successfully.`)
                        : kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Message State ' + result.status, result.status === 'UNKNOWN' || result.status === 'PENDING'
                            ? 'The edit may have reached Discord. Do not retry it with a new operation key.'
                            : `Discord rejected this edit (${result.errorCode || 'EDIT_FAILED'}).`)],
                ephemeral: true,
            });
        }
        catch {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Message Edit Unavailable', `KRAXXBot could not start or verify the edit for message \`${messageId}\`. Check the message and permissions, then try again.`)],
                ephemeral: true,
            });
        }
    }
    /**
     * Replies to a specific message ID in the channel.
     */
    static async replySay(interaction, messageId, replyContent) {
        const channel = interaction.channel;
        if (!channel) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Command must be executed within a text channel.')],
                ephemeral: true,
            });
            return;
        }
        try {
            const formattedContent = this.parseAndResolveMentions(replyContent, interaction.guild || undefined);
            const result = await this.executeOperation(interaction, channel, 'REPLY', formattedContent, undefined, messageId);
            const response = result.status === 'SUCCESS'
                ? kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Reply Dispatched', `Replied to message \`${messageId}\`.`)
                : kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Reply State ' + result.status, result.status === 'UNKNOWN' || result.status === 'PENDING'
                    ? 'The reply may have reached Discord. Do not retry with a new operation key.'
                    : `Discord rejected this reply (${result.errorCode || 'REPLY_FAILED'}).`);
            await interaction.reply({ embeds: [response], ephemeral: true });
        }
        catch {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Message Not Found', `Could not find message \`${messageId}\` to reply to.`)],
                ephemeral: true,
            });
        }
    }
    /**
     * Pins/keeps a message sent by the bot in the channel.
     */
    static async keepSay(interaction, messageId) {
        const channel = interaction.channel;
        if (!channel) {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Error', 'Command must be executed within a text channel.')],
                ephemeral: true,
            });
            return;
        }
        try {
            const result = await this.executeOperation(interaction, channel, 'PIN', undefined, undefined, messageId);
            const response = result.status === 'SUCCESS'
                ? kraxxEmbedBuilder_1.KraxxEmbedBuilder.success('Message Pinned', `Message \`${messageId}\` has been pinned and kept.`)
                : kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Pin State ' + result.status, result.status === 'UNKNOWN' || result.status === 'PENDING'
                    ? 'The pin may have reached Discord. Do not retry with a new operation key.'
                    : `Discord rejected the pin (${result.errorCode || 'PIN_FAILED'}).`);
            await interaction.reply({ embeds: [response], ephemeral: true });
        }
        catch {
            await interaction.reply({
                embeds: [kraxxEmbedBuilder_1.KraxxEmbedBuilder.error('Pin Unavailable', `KRAXXBot could not safely start or verify the pin for message \`${messageId}\`.`)],
                ephemeral: true,
            });
        }
    }
}
exports.SayService = SayService;
