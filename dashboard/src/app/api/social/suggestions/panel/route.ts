import { withMutation } from '@/lib/mutation';
import { validateChannel } from '@/lib/destinations';
import { executeDashboardMessageOperation } from '@/lib/message-operations';
import { requireGuildAccess } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { suggestionPanel } from '../../../../../../../src/services/suggestion.service';
import { assertTenant } from '../../../../../../../src/security/policy';
import { fetchBotRoleContext, fetchChannel, fetchChannelMessage, fetchChannelMessages } from '@/lib/discord';
import { NextRequest, NextResponse } from 'next/server';

const SNOWFLAKE = /^\d{17,20}$/;
const KEY = /^[A-Za-z0-9_-]{16,128}$/;

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const { guildId, channelId, idempotencyKey } = body;
  if (typeof guildId !== 'string' || !SNOWFLAKE.test(guildId) || typeof channelId !== 'string' || !SNOWFLAKE.test(channelId)
    || typeof idempotencyKey !== 'string' || !KEY.test(idempotencyKey)) return NextResponse.json({ error: 'Valid guild, channel, and idempotency key are required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized || !access.session?.user?.discordId) return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: access.status });
  const actorId = access.session.user.discordId;
  const socialModule = await prisma.guildModule.findUnique({ where: { guildId_module: { guildId, module: 'social' } } });
  if (!socialModule?.enabled) return NextResponse.json({ error: 'Enable Community Social before configuring suggestion submissions.' }, { status: 409 });
  await validateChannel(guildId, channelId, true, true);
  let config: Record<string, unknown>;
  try { const parsed = JSON.parse(socialModule.config || '{}'); config = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; }
  catch { return NextResponse.json({ error: 'Social module configuration is invalid; panel was not sent.' }, { status: 409 }); }
  const reuseOperation = config.suggestionChannelId === channelId && typeof config.suggestionPanelOperationKey === 'string'
    && config.suggestionPanelStatus !== 'FAILURE';
  const operationKey = reuseOperation ? config.suggestionPanelOperationKey as string : `suggestion_panel_${idempotencyKey}`;
  config.suggestionChannelId = channelId;
  config.suggestionGuildId = guildId;
  config.suggestionPanelStatus = 'PENDING';
  config.suggestionPanelOperationKey = operationKey;
  await prisma.guildModule.update({ where: { guildId_module: { guildId, module: 'social' } }, data: { config: JSON.stringify(config), updatedBy: actorId } });
  const result = await executeDashboardMessageOperation({ guildId, actorId, source: 'DASHBOARD', operationType: 'SEND',
    idempotencyKey: operationKey, channelId, ...suggestionPanel(operationKey), mentionMode: 'NONE' });
  let confirmedMessageId = result.status === 'SUCCESS' ? result.messageId : null;
  if (!confirmedMessageId && result.status !== 'FAILURE') {
    const [channel, context, messages] = await Promise.all([fetchChannel(channelId), fetchBotRoleContext(guildId), fetchChannelMessages(channelId)]);
    if (channel) assertTenant(guildId, channel.guild_id);
    const botId = context.botMember.user?.id;
    const footer = `Suggestion panel • ${operationKey}`;
    const recentMatch = botId ? messages.find(value => {
      const message = value as { channel_id?: string; author?: { id?: string }; embeds?: { footer?: { text?: string } }[] };
      return message.channel_id === channelId && message.author?.id === botId && message.embeds?.some(embed => embed?.footer?.text === footer);
    }) : undefined;
    if (recentMatch?.id) confirmedMessageId = recentMatch.id;
    if (!confirmedMessageId && result.messageId) {
      const message = await fetchChannelMessage(channelId, result.messageId);
      const candidate = message as { channel_id?: string; author?: { id?: string }; embeds?: { footer?: { text?: string } }[] };
      if (candidate.channel_id === channelId && candidate.author?.id === botId && candidate.embeds?.some(embed => embed?.footer?.text === footer)) confirmedMessageId = result.messageId;
    }
  }
  const operationStatus = confirmedMessageId ? 'SUCCESS' : result.status;
  config.suggestionPanelStatus = confirmedMessageId ? 'SYNCED' : result.status;
  if (confirmedMessageId) config.suggestionPanelMessageId = confirmedMessageId;
  await prisma.guildModule.update({ where: { guildId_module: { guildId, module: 'social' } }, data: { config: JSON.stringify(config), updatedBy: actorId } });
  if (operationStatus === 'SUCCESS') return NextResponse.json({ success: true, operationStatus: 'SUCCESS', panelMessageId: confirmedMessageId });
  return NextResponse.json({ success: false, operationStatus, error: 'Panel delivery was not confirmed. Retry using the same idempotency key; do not post a new panel.' },
    { status: operationStatus === 'FAILURE' ? 502 : 202 });
}

export const POST = withMutation('MANAGE_SETTINGS', handlePOST);
