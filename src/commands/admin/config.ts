import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getChannelDiagnostics } from '../../config/channels';
import { ORGANIZATIONAL_ROLES } from '../../config/roles';
import { PermissionsService } from '../../services/permissions.service';
import { KraxxEmbedBuilder } from '../../embeds/kraxxEmbedBuilder';
import { prisma } from '../../database/client';

function safeString(val: unknown, fallback = 'N/A'): string {
  if (val === undefined || val === null) return fallback;
  const str = String(val).trim();
  return str.length > 0 ? str : fallback;
}

function chunkLines(lines: string[], maxChars = 1000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > maxChars) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = line;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${line}` : line;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : ['No items available.'];
}

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('System diagnostic & configuration inspection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('check').setDescription('Display configured Discord roles and channels status')
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const member = interaction.member as any;
    const auth = PermissionsService.requireManagement(member);

    if (!auth.authorized) {
      await interaction.reply({
        embeds: [KraxxEmbedBuilder.error('Access Denied', auth.reason || 'Unauthorized.')],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'check') {
      // 1. Database Connectivity Check
      let dbStatus = 'DISCONNECTED';
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'CONNECTED';
      } catch {
        dbStatus = 'DISCONNECTED';
      }

      // 2. Discord & Guild Status
      const discordStatus = interaction.client.user ? 'CONNECTED' : 'DISCONNECTED';
      const guildName = interaction.guild?.name ? safeString(interaction.guild.name) : 'DM / NO_GUILD';
      const guildStatus = interaction.guild ? `CONNECTED (${guildName})` : 'NOT_IN_GUILD';

      // 3. Roles Status Assessment
      const roleEntries = Object.values(ORGANIZATIONAL_ROLES);
      const totalRoles = roleEntries.length;
      const configuredRolesCount = roleEntries.filter(r => Boolean(r.id && r.id.trim().length > 0)).length;
      const missingRoles = roleEntries.filter(r => !r.id || r.id.trim().length === 0);

      const roleLines = roleEntries.map(
        r => `• **${safeString(r.name)}** (\`${safeString(r.key)}\`): ${r.id && r.id.trim() ? `\`${r.id.trim()}\`` : '❌ `NOT_SET`'}`
      );

      // 4. Channels Status Assessment
      const channelDiag = getChannelDiagnostics();
      const totalChannels = channelDiag.length;
      const configuredChannelsCount = channelDiag.filter(c => c.configured).length;
      const missingChannels = channelDiag.filter(c => !c.configured);

      const channelLines = channelDiag.map(
        c => `• **${safeString(c.name)}** (\`${safeString(c.key)}\`): ${c.configured ? `\`${safeString(c.id)}\`` : '❌ `NOT_SET`'}`
      );

      // 5. Ticket System Specific Readiness
      const founderConfigured = Boolean(ORGANIZATIONAL_ROLES.FOUNDER?.id && ORGANIZATIONAL_ROLES.FOUNDER.id.trim().length > 0);
      const cofounderConfigured = Boolean(ORGANIZATIONAL_ROLES.COFOUNDER?.id && ORGANIZATIONAL_ROLES.COFOUNDER.id.trim().length > 0);
      const managementConfigured = Boolean(ORGANIZATIONAL_ROLES.MANAGEMENT_HEAD?.id && ORGANIZATIONAL_ROLES.MANAGEMENT_HEAD.id.trim().length > 0);

      const logsDiag = channelDiag.find(c => c.key === 'TICKET_LOGS');
      const transcriptsDiag = channelDiag.find(c => c.key === 'TICKET_TRANSCRIPTS');

      const ticketDiagLines = [
        `• Founder Role: ${founderConfigured ? `\`${ORGANIZATIONAL_ROLES.FOUNDER.id}\`` : '⚙️ `FALLBACK / TIER 100`'}`,
        `• Co-Founder Role: ${cofounderConfigured ? `\`${ORGANIZATIONAL_ROLES.COFOUNDER.id}\`` : '⚙️ `FALLBACK / TIER 90`'}`,
        `• Management Head Role: ${managementConfigured ? `\`${ORGANIZATIONAL_ROLES.MANAGEMENT_HEAD.id}\`` : '⚙️ `FALLBACK / TIER 80`'}`,
        `• Ticket Logs Channel: ${logsDiag?.configured ? `\`${logsDiag.id}\`` : '⚙️ `AUTO-CREATE (#ticket-logs)`'}`,
        `• Ticket Transcripts Channel: ${transcriptsDiag?.configured ? `\`${transcriptsDiag.id}\`` : '⚙️ `AUTO-CREATE (#ticket-transcripts)`'}`,
      ];

      // 6. Overall Status Determination
      const isFullyConfigured = missingRoles.length === 0 && missingChannels.length === 0;
      const overallStatus = isFullyConfigured ? 'READY' : 'INCOMPLETE / DEGRADED';

      // 7. Build Embed
      const embed = KraxxEmbedBuilder.createHeader('KRAXX HQ DIAGNOSTIC OVERVIEW', 'CONFIGURATION');

      embed.addFields(
        {
          name: 'SYSTEM',
          value: `Database: \`${safeString(dbStatus)}\`\nDiscord: \`${safeString(discordStatus)}\`\nGuild: \`${safeString(guildStatus)}\``,
          inline: true,
        },
        {
          name: 'ROLES',
          value: `Configured: \`${configuredRolesCount}/${totalRoles}\`\nStatus: \`${missingRoles.length === 0 ? 'COMPLETE' : 'INCOMPLETE'}\``,
          inline: true,
        },
        {
          name: 'CHANNELS',
          value: `Configured: \`${configuredChannelsCount}/${totalChannels}\`\nStatus: \`${missingChannels.length === 0 ? 'COMPLETE' : 'INCOMPLETE'}\``,
          inline: true,
        },
        {
          name: 'TICKET SYSTEM READINESS',
          value: ticketDiagLines.join('\n'),
          inline: false,
        },
        {
          name: 'STATUS',
          value: `\`${safeString(overallStatus)}\` ${isFullyConfigured ? '🟢' : '⚠️'}`,
          inline: false,
        }
      );

      // Add Missing Configuration Summary if any
      if (!isFullyConfigured) {
        const missingSummaryParts: string[] = [];
        if (missingRoles.length > 0) {
          missingSummaryParts.push(`**Missing Roles (${missingRoles.length}):** ${missingRoles.map(r => `\`${r.key}\``).join(', ')}`);
        }
        if (missingChannels.length > 0) {
          missingSummaryParts.push(`**Missing Channels (${missingChannels.length}):** ${missingChannels.map(c => `\`${c.key}\``).join(', ')}`);
        }
        embed.addFields({
          name: 'MISSING CONFIGURATION',
          value: missingSummaryParts.join('\n\n'),
          inline: false,
        });
      }

      // Add Roles Breakdown
      const roleChunks = chunkLines(roleLines, 1000);
      roleChunks.forEach((chunk, index) => {
        const title = roleChunks.length > 1 ? `Organizational Roles Status (${index + 1}/${roleChunks.length})` : 'Organizational Roles Status';
        embed.addFields({ name: title, value: safeString(chunk), inline: false });
      });

      // Add Channels Breakdown
      const channelChunks = chunkLines(channelLines, 1000);
      channelChunks.forEach((chunk, index) => {
        const title = channelChunks.length > 1 ? `Channel Mappings Status (${index + 1}/${channelChunks.length})` : 'Channel Mappings Status';
        embed.addFields({ name: title, value: safeString(chunk), inline: false });
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

