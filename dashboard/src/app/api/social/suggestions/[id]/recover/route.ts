import { withMutation } from '@/lib/mutation';
import { requireGuildAccess } from '@/lib/permissions';
import { SuggestionService } from '../../../../../../../../src/services/suggestion.service';
import { assertTenant } from '../../../../../../../../src/security/policy';
import { fetchBotRoleContext, fetchChannel, fetchChannelMessages } from '@/lib/discord';
import { validateChannel } from '@/lib/destinations';
import { NextRequest, NextResponse } from 'next/server';

async function handlePOST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId is required.' }, { status: 400 });
  const access = await requireGuildAccess(guildId);
  if (!access.authorized || !access.session?.user?.discordId) return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: access.status });
  try {
    const { id } = await params;
    const result = await SuggestionService.recoverSubmission({ guildId, actorId: access.session.user.discordId, suggestionId: id }, async () => undefined,
      async (channelId, suggestionId) => {
        await validateChannel(guildId, channelId, false, false);
        const [channel, context, messages] = await Promise.all([fetchChannel(channelId), fetchBotRoleContext(guildId), fetchChannelMessages(channelId)]);
        if (!channel) return null;
        assertTenant(guildId, channel.guild_id);
        const botId = context.botMember.user?.id;
        if (!botId) return null;
        const footer = `Suggestion • ${suggestionId}`;
        const match = messages.find(value => {
          const message = value as { channel_id?: string; author?: { id?: string }; embeds?: { footer?: { text?: string } }[] };
          return message.channel_id === channelId && message.author?.id === botId && Array.isArray(message.embeds)
            && message.embeds.some(embed => embed?.footer?.text === footer);
        });
        return match?.id || null;
      });
    return NextResponse.json({ success: result.operationStatus === 'SYNCED', ...result }, { status: result.operationStatus === 'SYNCED' || result.operationStatus === 'FAILURE' ? 200 : 202 });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const status = code === 'SUGGESTION_NOT_FOUND' ? 404 : code === 'SUGGESTION_OPERATION_NOT_FOUND' ? 409 : 500;
    return NextResponse.json({ error: status === 500 ? 'Recovery could not verify this operation.' : code }, { status });
  }
}

export const POST = withMutation('MANAGE_SUGGESTIONS', handlePOST);
