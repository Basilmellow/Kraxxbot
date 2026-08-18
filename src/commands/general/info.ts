import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Overview of KRAXX HQ organization, divisions & bot architecture'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = KraxxEmbedBuilder.createHeader('ORGANIZATION & PLATFORM OVERVIEW', 'ABOUT');
    embed.setDescription(
      `**KRAXX** is the parent organization operating specialized divisions inside Discord HQ:\n\n` +
      `🛡️ **KRAXXSEC** — *Cybersecurity & Security Engineering*\n` +
      `🎨 **KRAXX STUDIO** — *Digital Creative & Technology Services*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**KRAXX Operations System** automates onboarding, role-based access control, division task management, announcements, and audit logging.`
    );

    embed.addFields(
      { name: 'Architecture', value: 'Node.js / TypeScript / discord.js v14 / Prisma ORM', inline: false },
      { name: 'Security Policy', value: 'Strict role hierarchy enforcement, Zero hardcoded credentials.', inline: false }
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
