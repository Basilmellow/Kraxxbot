"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const kraxxEmbedBuilder_1 = require("../../embeds/kraxxEmbedBuilder");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('info')
        .setDescription('Overview of KRAXX HQ organization, divisions & bot architecture'),
    async execute(interaction) {
        const embed = kraxxEmbedBuilder_1.KraxxEmbedBuilder.createHeader('ORGANIZATION & PLATFORM OVERVIEW', 'ABOUT');
        embed.setDescription(`**KRAXX** is the parent organization operating specialized divisions inside Discord HQ:\n\n` +
            `🛡️ **KRAXXSEC** — *Cybersecurity & Security Engineering*\n` +
            `🎨 **KRAXX STUDIO** — *Digital Creative & Technology Services*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**KRAXX Operations System** automates onboarding, role-based access control, division task management, announcements, and audit logging.`);
        embed.addFields({ name: 'Architecture', value: 'Node.js / TypeScript / discord.js v14 / Prisma ORM', inline: false }, { name: 'Security Policy', value: 'Strict role hierarchy enforcement, Zero hardcoded credentials.', inline: false });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
