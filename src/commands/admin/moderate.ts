import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../database/client';
import { MODERATION_ACTIONS } from '../../services/moderation-contract';
import { createModerationAdapter } from '../../services/moderation-discord';
import { moderationFailureCode, runModeration } from '../../services/moderation.service';

export default {
  data: new SlashCommandBuilder()
    .setName('moderate')
    .setDescription('Record and execute an authorized moderation action')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o =>
      o
        .setName('action')
        .setDescription('LOCK controls @everyone Send Messages only')
        .setRequired(true)
        .addChoices(...MODERATION_ACTIONS.map(a => ({ name: a.toLowerCase(), value: a })))
    )
    .addStringOption(o =>
      o
        .setName('target')
        .setDescription('Member ID, or channel ID for channel actions')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason').setDescription('Reason saved in case history').setMaxLength(400)
    )
    .addIntegerOption(o =>
      o
        .setName('seconds')
        .setDescription('Timeout / slowmode seconds; zero removes the setting')
        .setMinValue(0)
        .setMaxValue(2419200)
    )
    .addIntegerOption(o =>
      o
        .setName('count')
        .setDescription('PURGE: inspect last 1–100 messages; skip pinned/old messages')
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addIntegerOption(o =>
      o
        .setName('case')
        .setDescription('ESCALATE: active WARN or TIMEOUT case number')
        .setMinValue(1)
    )
    .addStringOption(o =>
      o
        .setName('evidence')
        .setDescription('Discord message links, separated by spaces')
        .setMaxLength(1500)
    ),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'Use this command in a server.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const record = await runModeration(
        prisma,
        createModerationAdapter(process.env.DISCORD_TOKEN || ''),
        {
          guildId: interaction.guildId,
          requestKey: interaction.id,
          targetId: interaction.options.getString('target', true),
          action: interaction.options.getString('action', true),
          reason: interaction.options.getString('reason') ?? undefined,
          durationSeconds: interaction.options.getInteger('seconds') ?? undefined,
          count: interaction.options.getInteger('count') ?? undefined,
          sourceCaseNumber: interaction.options.getInteger('case') ?? undefined,
          evidence: interaction.options.getString('evidence')?.trim().split(/\s+/),
        },
        interaction.user.id,
        'BOT'
      );
      await interaction.editReply({
        content: `Case #${record.caseNumber}: ${record.action} — ${record.status}${record.errorCode ? ` (${record.errorCode})` : ''}.${record.status === 'UNKNOWN' || record.status === 'PENDING' ? ' Verify Discord state before another attempt.' : ''}`,
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      await interaction.editReply({
        content: `Moderation not confirmed: ${moderationFailureCode(error)}. Verify case history before retrying.`,
        allowedMentions: { parse: [] },
      });
    }
  },
};
