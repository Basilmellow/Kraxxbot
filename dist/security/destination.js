"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerDestination = workerDestination;
const discord_js_1 = require("discord.js");
const policy_1 = require("./policy");
async function workerDestination(client, guildId, channelId) {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);
    (0, policy_1.assertTenant)(guildId, channel?.guild.id);
    const bot = await guild.members.fetchMe();
    if (!channel || !channel.isTextBased() || channel.isThread()
        || !channel.permissionsFor(bot)?.has([discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages, discord_js_1.PermissionFlagsBits.EmbedLinks]))
        throw new policy_1.PolicyError('Destination is unavailable to the bot.');
    return channel;
}
