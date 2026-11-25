"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMessageCreate = onMessageCreate;
const kraxx_ai_discord_1 = require("../services/kraxx-ai-discord");
const kraxx_ai_service_1 = require("../services/kraxx-ai.service");
const logger_1 = require("../utils/logger");
async function onMessageCreate(message) {
    const botId = message.client.user?.id;
    if (!botId || !message.guild || !message.guildId || message.author.bot || message.webhookId || !message.mentions.users.has(botId))
        return;
    const prompt = message.content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
    try {
        await (0, kraxx_ai_service_1.executeKraxxAi)({ guildId: message.guildId, userId: message.author.id, channelId: message.channelId,
            requestId: message.id, prompt, verifyMembership: async () => Boolean(await message.guild.members.fetch(message.author.id)),
            verifyChannel: async () => { const channel = await message.guild.channels.fetch(message.channelId); return Boolean(channel && channel.guildId === message.guildId && channel.isTextBased() && 'send' in channel); } }, (0, kraxx_ai_discord_1.createKraxxAiDelivery)(message.guild));
    }
    catch (error) {
        // Disabled, unavailable, disallowed-channel, cooldown, and malformed requests are intentionally silent for mentions.
        if (error instanceof kraxx_ai_service_1.KraxxAiError)
            return;
        logger_1.logger.warn({ guildId: message.guildId, userId: message.author.id, requestId: message.id, code: error instanceof Error ? error.name : 'UNKNOWN' }, 'Kraxx AI mention rejected');
    }
}
