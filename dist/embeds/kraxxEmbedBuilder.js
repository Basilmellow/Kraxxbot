"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KraxxEmbedBuilder = exports.KRAXX_COLORS = void 0;
const discord_js_1 = require("discord.js");
exports.KRAXX_COLORS = {
    BRAND: 0x00f0ff, // Cyber Aqua / Primary Brand
    SECURITY: 0x10b981, // Emerald Green / KRAXXSEC
    STUDIO: 0x6366f1, // Indigo / KRAXX STUDIO
    NEUTRAL: 0x3b82f6, // Corporate Blue
    WARNING: 0xf59e0b, // Amber Warning
    DANGER: 0xef4444, // Crimson Error
    DARK: 0x0b0e14, // Dark Minimal
};
class KraxxEmbedBuilder extends discord_js_1.EmbedBuilder {
    constructor() {
        super();
        this.setColor(exports.KRAXX_COLORS.BRAND);
        this.setFooter({
            text: 'KRAXX Operations System',
        });
        this.setTimestamp();
    }
    static createHeader(title, category) {
        const embed = new KraxxEmbedBuilder();
        const formattedTitle = category ? `KRAXXBot │ ${category.toUpperCase()}` : 'KRAXXBot';
        embed.setTitle(formattedTitle);
        embed.setDescription(`**${title}**`);
        return embed;
    }
    static welcome(serverName) {
        const embed = new KraxxEmbedBuilder();
        embed.setColor(exports.KRAXX_COLORS.BRAND);
        embed.setTitle(serverName ? `${serverName.toUpperCase()} │ WELCOME` : 'KRAXXBot │ WELCOME');
        const welcomeTarget = serverName ? `**${serverName}**` : 'our server';
        embed.setDescription(`Welcome to ${welcomeTarget}.\n\n` +
            `This server is powered by **KRAXXBot Operations System**.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Please verify your membership to access server channels.`);
        return embed;
    }
    static verification(serverName) {
        const embed = new KraxxEmbedBuilder();
        embed.setColor(exports.KRAXX_COLORS.SECURITY);
        embed.setTitle(serverName ? `${serverName.toUpperCase()} │ MEMBER VERIFICATION` : 'KRAXXBot │ MEMBER VERIFICATION');
        const target = serverName ? `**${serverName}**` : 'Server';
        embed.setDescription(`Welcome to ${target} Verification.\n\n` +
            `Click the **[ VERIFY ]** button below to complete verification and obtain server access.\n\n` +
            `*Specialized and management access are granted separately by authorized server managers.*`);
        return embed;
    }
    static announcement(title, content, department = 'GENERAL', type = 'GENERAL', authorName, imageUrl) {
        const embed = new KraxxEmbedBuilder();
        let color = exports.KRAXX_COLORS.BRAND;
        if (department === 'KRAXXSEC')
            color = exports.KRAXX_COLORS.SECURITY;
        if (department === 'KRAXX_STUDIO')
            color = exports.KRAXX_COLORS.STUDIO;
        if (type === 'IMPORTANT')
            color = exports.KRAXX_COLORS.WARNING;
        embed.setColor(color);
        embed.setTitle(`KRAXX │ ANNOUNCEMENT [${type.toUpperCase()}]`);
        embed.setDescription(`### ${title}\n\n` +
            `${content}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        embed.addFields({ name: 'Division', value: `\`${department}\``, inline: true }, { name: 'Category', value: `\`${type}\``, inline: true });
        if (authorName) {
            embed.addFields({ name: 'Issued By', value: authorName, inline: true });
        }
        if (imageUrl) {
            embed.setImage(imageUrl);
        }
        return embed;
    }
    static task(taskNumber, title, description, status, priority, department, assigneeText, dueDateText) {
        const embed = new KraxxEmbedBuilder();
        let color = exports.KRAXX_COLORS.NEUTRAL;
        if (priority === 'HIGH' || priority === 'URGENT')
            color = exports.KRAXX_COLORS.WARNING;
        if (status === 'COMPLETED')
            color = exports.KRAXX_COLORS.SECURITY;
        embed.setColor(color);
        embed.setTitle(`TASK #${taskNumber} │ ${title}`);
        embed.setDescription(description);
        embed.addFields({ name: 'Status', value: `\`${status}\``, inline: true }, { name: 'Priority', value: `\`${priority}\``, inline: true }, { name: 'Department', value: `\`${department}\``, inline: true }, { name: 'Assignee', value: assigneeText, inline: true }, { name: 'Due Date', value: dueDateText || 'Not Set', inline: true });
        return embed;
    }
    static meeting(title, agenda, department, startTimeText, organizerText, locationText) {
        const embed = new KraxxEmbedBuilder();
        embed.setColor(exports.KRAXX_COLORS.BRAND);
        embed.setTitle(`INTERNAL MEETING │ ${title}`);
        embed.setDescription(`**Agenda:**\n${agenda}`);
        embed.addFields({ name: 'Department', value: `\`${department}\``, inline: true }, { name: 'Start Time', value: startTimeText, inline: true }, { name: 'Organizer', value: organizerText, inline: true }, { name: 'Location Channel', value: locationText || 'TBD', inline: true });
        return embed;
    }
    static event(title, description, type, department, startTimeText, location) {
        const embed = new KraxxEmbedBuilder();
        embed.setColor(exports.KRAXX_COLORS.STUDIO);
        embed.setTitle(`KRAXX EVENT │ ${title}`);
        embed.setDescription(description);
        embed.addFields({ name: 'Type', value: `\`${type}\``, inline: true }, { name: 'Department', value: `\`${department}\``, inline: true }, { name: 'Schedule', value: startTimeText, inline: true }, { name: 'Location', value: location || 'Discord Server', inline: true });
        return embed;
    }
    static audit(action, executorText, details, targetText) {
        const embed = new KraxxEmbedBuilder();
        embed.setColor(exports.KRAXX_COLORS.DARK);
        embed.setTitle(`AUDIT LOG │ ${action.toUpperCase()}`);
        embed.setDescription(`**Action Executed:** \`${action}\``);
        embed.addFields({ name: 'Executor', value: executorText, inline: true }, { name: 'Target', value: targetText || 'N/A', inline: true });
        if (details) {
            embed.addFields({ name: 'Details', value: details, inline: false });
        }
        return embed;
    }
    static success(title, message) {
        const embed = new KraxxEmbedBuilder();
        embed.setColor(exports.KRAXX_COLORS.SECURITY);
        embed.setTitle(`SUCCESS │ ${title}`);
        embed.setDescription(message);
        return embed;
    }
    static error(title, message) {
        const embed = new KraxxEmbedBuilder();
        embed.setColor(exports.KRAXX_COLORS.DANGER);
        embed.setTitle(`ERROR │ ${title}`);
        embed.setDescription(message);
        return embed;
    }
}
exports.KraxxEmbedBuilder = KraxxEmbedBuilder;
