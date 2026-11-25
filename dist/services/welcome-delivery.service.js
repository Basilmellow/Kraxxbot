"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderWelcomeText = renderWelcomeText;
exports.createWelcomeDeliveryAdapter = createWelcomeDeliveryAdapter;
exports.deliverMemberWelcome = deliverMemberWelcome;
exports.deliverMemberGoodbye = deliverMemberGoodbye;
const discord_transport_1 = require("./discord-transport");
function renderWelcomeText(template, member) {
    return template
        .replaceAll('{user}', `<@${member.userId}>`)
        .replaceAll('{username}', member.username)
        .replaceAll('{server}', member.guildName)
        .replaceAll('{memberCount}', String(member.memberCount))
        .replaceAll('{rules}', 'the server rules');
}
function failureCode(error) {
    if (error instanceof Error && error.message === 'DISCORD_NOT_CONFIGURED')
        return 'DISCORD_NOT_CONFIGURED';
    return error instanceof discord_transport_1.DiscordApiError ? `DISCORD_${error.status}` : 'DELIVERY_FAILED';
}
function createWelcomeDeliveryAdapter(token, request = discord_transport_1.discordRequest) {
    const api = 'https://discord.com/api/v10';
    const headers = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' };
    const call = (url, method, body) => {
        if (!token)
            throw new Error('DISCORD_NOT_CONFIGURED');
        return request(url, {
            method,
            headers,
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
    };
    return {
        async sendGuildMessage(guildId, channelId, payload) {
            const response = await call(`${api}/channels/${channelId}`, 'GET');
            const channel = await response.json();
            if (channel.id !== channelId || channel.guild_id !== guildId || ![0, 5].includes(channel.type))
                throw new Error('WELCOME_CHANNEL_SCOPE_INVALID');
            await call(`${api}/channels/${channelId}/messages`, 'POST', payload);
        },
        async sendDirectMessage(userId, payload) {
            const response = await call(`${api}/users/@me/channels`, 'POST', { recipient_id: userId });
            const channel = await response.json();
            if (!channel.id)
                throw new Error('DM_CHANNEL_UNAVAILABLE');
            await call(`${api}/channels/${channel.id}/messages`, 'POST', payload);
        },
    };
}
async function deliverMemberWelcome(config, member, adapter) {
    if (!config.enabled)
        return [];
    const payloadFor = (template, withImage = false) => ({
        content: renderWelcomeText(template, member),
        ...(withImage && config.imageUrl ? { embeds: [{ image: { url: config.imageUrl } }] } : {}),
        allowed_mentions: { parse: [], users: [member.userId] },
    });
    const sends = [];
    if (config.channelId)
        sends.push({
            target: 'CHANNEL',
            send: () => adapter.sendGuildMessage(member.guildId, config.channelId, payloadFor(config.message || 'Welcome {user} to **{server}**! We are now {memberCount} members.', true)),
        });
    if (config.dmEnabled)
        sends.push({
            target: 'DM',
            send: () => adapter.sendDirectMessage(member.userId, payloadFor(config.dmMessage || 'Welcome to {server}! Please review {rules} to get started.')),
        });
    const settled = await Promise.all(sends.map(async ({ target, send }) => {
        try {
            await send();
            return { target, status: 'SUCCESS' };
        }
        catch (error) {
            return { target, status: 'FAILURE', errorCode: failureCode(error) };
        }
    }));
    return settled;
}
async function deliverMemberGoodbye(config, member, adapter) {
    if (!config.enabled || !config.leaveChannelId)
        return null;
    try {
        await adapter.sendGuildMessage(member.guildId, config.leaveChannelId, {
            content: renderWelcomeText(config.leaveMessage || '{username} has departed from {server}.', member),
            allowed_mentions: { parse: [], users: [member.userId] },
        });
        return { target: 'CHANNEL', status: 'SUCCESS' };
    }
    catch (error) {
        return { target: 'CHANNEL', status: 'FAILURE', errorCode: failureCode(error) };
    }
}
